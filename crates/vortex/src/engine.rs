use crate::{
    DownloadError, DownloadRequest, EngineConfig, Result, TaskEvent, TaskId, TaskSnapshot,
    TaskState, model::Record, storage, transfer,
};
use fs2::FileExt;
use sqlx::SqlitePool;
use std::future::Future;
use std::{
    collections::BTreeMap,
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
};
use tokio::sync::{Mutex, Semaphore, broadcast};
use tokio_util::sync::CancellationToken;

struct Control {
    cancel: CancellationToken,
    join: tokio::task::JoinHandle<()>,
}
struct Inner {
    records: Mutex<BTreeMap<TaskId, Record>>,
    controls: Mutex<BTreeMap<TaskId, Control>>,
    commands: Mutex<()>,
    permits: Arc<Semaphore>,
    pool: SqlitePool,
    events: broadcast::Sender<TaskEvent>,
    last_event: Mutex<BTreeMap<TaskId, (std::time::Instant, TaskState)>>,
    closed: AtomicBool,
    config: EngineConfig,
    client: reqwest::Client,
    state_lock: Mutex<Option<std::fs::File>>,
}
#[derive(Clone)]
pub struct Engine(Arc<Inner>);

impl Engine {
    pub async fn open(state_directory: impl AsRef<Path>, config: EngineConfig) -> Result<Self> {
        if !(1..=32).contains(&config.max_tasks) || !(1..=16).contains(&config.connections) {
            return Err(DownloadError::new(
                "configuration",
                "Task limit must be 1–32 and connections 1–16",
            ));
        }
        tokio::fs::create_dir_all(state_directory.as_ref()).await?;
        let lock = std::fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .open(state_directory.as_ref().join("engine.lock"))?;
        lock.try_lock_exclusive().map_err(|_| {
            DownloadError::new(
                "state_locked",
                "Another engine is using this state directory",
            )
        })?;
        let pool = storage::open(state_directory.as_ref()).await?;
        let records = storage::load(&pool).await?;
        let (events, _) = broadcast::channel(256);
        let engine = Self(Arc::new(Inner {
            records: Mutex::new(BTreeMap::new()),
            controls: Mutex::new(BTreeMap::new()),
            commands: Mutex::new(()),
            permits: Arc::new(Semaphore::new(config.max_tasks)),
            pool,
            events,
            closed: AtomicBool::new(false),
            config,
            last_event: Mutex::new(BTreeMap::new()),
            client: reqwest::Client::builder()
                .connect_timeout(std::time::Duration::from_secs(15))
                .no_gzip()
                .no_brotli()
                .no_deflate()
                .no_zstd()
                .read_timeout(std::time::Duration::from_secs(30))
                .redirect(reqwest::redirect::Policy::limited(10))
                .build()?,
            state_lock: Mutex::new(Some(lock)),
        }));
        // Preserve database insertion order when re-enqueuing recovered tasks.
        let mut queue = Vec::new();
        for mut record in records {
            if record.task.state == TaskState::Removed {
                let _ = tokio::fs::remove_file(transfer::temporary_path(&record)).await;
            }
            if record.task.state == TaskState::Complete {
                let _ = tokio::fs::remove_file(transfer::temporary_path(&record)).await;
            }
            record.task.speed = 0;
            record.task.connections = 0;
            let runnable = matches!(
                record.task.state,
                TaskState::Queued
                    | TaskState::Connecting
                    | TaskState::Downloading
                    | TaskState::RetryWaiting
            );
            if runnable {
                record.task.state = TaskState::Queued;
                record.task.completed = if record.final_hash.is_some() {
                    record.task.total.unwrap_or(record.task.completed)
                } else {
                    transfer::committed(&record)
                };
            }
            let id = record.task.id.clone();
            engine.publish(&mut record, true).await?;
            if runnable {
                queue.push(id);
            }
        }
        for id in queue {
            engine.launch(id).await;
        }
        Ok(engine)
    }

    pub fn subscribe(&self) -> broadcast::Receiver<TaskEvent> {
        self.0.events.subscribe()
    }
    pub async fn list(&self) -> Vec<TaskSnapshot> {
        self.0
            .records
            .lock()
            .await
            .values()
            .filter(|r| r.task.state != TaskState::Removed)
            .map(|r| r.task.clone())
            .collect()
    }
    pub async fn get(&self, id: &str) -> Result<TaskSnapshot> {
        Ok(self.record(id).await?.task)
    }
    async fn record(&self, id: &str) -> Result<Record> {
        self.0
            .records
            .lock()
            .await
            .get(id)
            .cloned()
            .ok_or_else(|| DownloadError::new("not_found", "Task not found"))
    }
    fn ensure_open(&self) -> Result<()> {
        if self.0.closed.load(Ordering::Acquire) {
            Err(DownloadError::new("closed", "Engine is shut down"))
        } else {
            Ok(())
        }
    }
    pub async fn add(&self, mut request: DownloadRequest) -> Result<TaskId> {
        let _guard = self.0.commands.lock().await;
        self.ensure_open()?;
        transfer::validate_request(&request)?;
        tokio::fs::create_dir_all(&request.directory).await?;
        request.directory = tokio::fs::canonicalize(&request.directory).await?;
        let id = uuid::Uuid::new_v4().to_string();
        let name = transfer::filename(&request, None, &id);
        let mut record = Record {
            version: 1,
            task: TaskSnapshot {
                id: id.clone(),
                revision: 0,
                state: TaskState::Queued,
                url: request.url.clone(),
                path: request.directory.join(name),
                total: None,
                completed: 0,
                speed: 0,
                connections: 0,
                error: None,
            },
            request,
            validator: None,
            chunks: vec![],
            final_hash: None,
        };
        self.publish(&mut record, true).await?;
        self.launch(id.clone()).await;
        Ok(id)
    }
    pub async fn pause(&self, id: &str) -> Result<()> {
        let _guard = self.0.commands.lock().await;
        self.ensure_open()?;
        self.stop(id).await?;
        let mut r = self.record(id).await?;
        if !matches!(r.task.state, TaskState::Complete | TaskState::Removed) {
            r.task.state = TaskState::Paused;
            self.publish(&mut r, true).await?;
        }
        Ok(())
    }
    pub async fn resume(&self, id: &str) -> Result<()> {
        let _guard = self.0.commands.lock().await;
        self.ensure_open()?;
        let mut r = self.record(id).await?;
        if !matches!(r.task.state, TaskState::Paused | TaskState::Failed) {
            return Ok(());
        }
        self.stop(id).await?;
        r.task.state = TaskState::Queued;
        r.task.error = None;
        self.publish(&mut r, true).await?;
        self.launch(id.into()).await;
        Ok(())
    }
    pub async fn retry(&self, id: &str) -> Result<()> {
        self.resume(id).await
    }
    pub async fn remove(&self, id: &str) -> Result<()> {
        let _guard = self.0.commands.lock().await;
        self.ensure_open()?;
        self.stop(id).await?;
        let mut r = self.record(id).await?;
        // Persist the tombstone first so a crash cannot resurrect a removed task.
        r.task.state = TaskState::Removed;
        self.publish(&mut r, true).await?;
        match tokio::fs::remove_file(transfer::temporary_path(&r)).await {
            Ok(()) => (),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(e) => return Err(e.into()),
        }
        Ok(())
    }
    pub async fn shutdown(&self) -> Result<()> {
        let _guard = self.0.commands.lock().await;
        if self.0.closed.swap(true, Ordering::AcqRel) {
            return Ok(());
        }
        let controls = std::mem::take(&mut *self.0.controls.lock().await);
        for c in controls.values() {
            c.cancel.cancel();
        }
        let mut failure = None;
        for (_, c) in controls {
            if c.join.await.is_err() {
                failure = Some(DownloadError::new("worker", "Download worker failed"));
            }
        }
        for record in self.0.records.lock().await.values() {
            if let Some(error) = &record.task.error
                && error.code == "storage"
            {
                failure = Some(error.clone());
            }
        }
        self.0.pool.close().await;
        self.0.state_lock.lock().await.take();
        failure.map_or(Ok(()), Err)
    }
    async fn stop(&self, id: &str) -> Result<()> {
        let control = self.0.controls.lock().await.remove(id);
        if let Some(c) = control {
            c.cancel.cancel();
            c.join
                .await
                .map_err(|_| DownloadError::new("worker", "Download worker failed"))?;
        }
        Ok(())
    }
    async fn launch(&self, id: TaskId) {
        let cancel = CancellationToken::new();
        let token = cancel.clone();
        let engine = self.clone();
        // Register the acquire in command order, before spawning, to guarantee FIFO.
        let mut acquisition = Box::pin(self.0.permits.clone().acquire_owned());
        let acquired = std::future::poll_fn(|cx| {
            std::task::Poll::Ready(match acquisition.as_mut().poll(cx) {
                std::task::Poll::Ready(value) => Some(value),
                std::task::Poll::Pending => None,
            })
        })
        .await;
        let task_id = id.clone();
        let join = tokio::spawn(async move {
            let permit = match acquired {
                Some(p) => p.ok(),
                None => tokio::select! { p = acquisition => p.ok(), _ = token.cancelled() => None },
            };
            if permit.is_none() {
                return;
            }
            let Ok(mut r) = engine.record(&task_id).await else {
                return;
            };
            let mut outcome = Ok(());
            for attempt in 0..=3 {
                if token.is_cancelled() {
                    break;
                }
                r.task.state = TaskState::Connecting;
                r.task.error = None;
                outcome = engine.publish(&mut r, true).await;
                if outcome.is_err() {
                    break;
                }
                outcome = transfer::download(
                    &engine,
                    &engine.0.client,
                    &mut r,
                    engine.0.config.connections,
                    &token,
                )
                .await;
                match &outcome {
                    Err(e) if e.retryable && attempt < 3 && !token.is_cancelled() => {
                        r.task.state = TaskState::RetryWaiting;
                        r.task.error = Some(e.clone());
                        let delay = e.retry_after.unwrap_or(1 << attempt);
                        if let Err(e) = engine.publish(&mut r, true).await {
                            outcome = Err(e);
                            break;
                        }
                        tokio::select! { _ = token.cancelled() => break, _ = tokio::time::sleep(std::time::Duration::from_secs(delay)) => () }
                    }
                    _ => break,
                }
            }
            r.task.speed = 0;
            r.task.connections = 0;
            if token.is_cancelled() && r.task.state != TaskState::Complete {
                r.task.state = TaskState::Queued;
                r.task.completed = transfer::committed(&r);
            } else if let Err(e) = outcome {
                r.task.state = TaskState::Failed;
                r.task.error = Some(e);
            }
            // A failed checkpoint is reported to subscribers, never presented as success.
            if let Err(e) = engine.publish(&mut r, true).await {
                r.task.state = TaskState::Failed;
                r.task.error = Some(e);
                let _ = engine.publish(&mut r, false).await;
            }
        });
        self.0
            .controls
            .lock()
            .await
            .insert(id, Control { cancel, join });
    }
    pub(crate) async fn publish(&self, r: &mut Record, persist: bool) -> Result<()> {
        r.task.revision += 1;
        if persist {
            storage::save(&self.0.pool, r).await?;
        }
        self.0
            .records
            .lock()
            .await
            .insert(r.task.id.clone(), r.clone());
        let mut last = self.0.last_event.lock().await;
        let notify = last.get(&r.task.id).is_none_or(|(when, state)| {
            *state != r.task.state || when.elapsed() >= std::time::Duration::from_millis(250)
        });
        if notify {
            last.insert(r.task.id.clone(), (std::time::Instant::now(), r.task.state));
            let _ = self.0.events.send(TaskEvent {
                task: r.task.clone(),
            });
        }
        Ok(())
    }
}
