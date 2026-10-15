use std::{
    collections::{HashMap, HashSet},
    future::Future,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::{Mutex, MutexGuard};

mod engines;
mod files;

use engines::*;
use files::*;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum EngineKind {
    Aria2c,
    Vortex,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
pub struct TaskRef {
    engine: EngineKind,
    id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileResult {
    path: PathBuf,
    outcome: FileOutcome,
    error: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct TaskResult {
    task: TaskRef,
    removed: bool,
    stage: Option<DeletionStage>,
    error: Option<String>,
    files: Vec<FileResult>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
enum FileOutcome {
    Trashed,
    Deleted,
    Missing,
    Failed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
enum DeletionStage {
    Stop,
    Files,
    Remove,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletionReport {
    tasks: Vec<TaskResult>,
    retry_token: Option<String>,
    session_error: Option<String>,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Resolution {
    DeletePermanently,
    Cancel,
}

#[derive(Clone, Debug)]
struct Assets {
    directory: PathBuf,
    files: Vec<PathBuf>,
}

struct Pending {
    report: DeletionReport,
    assets: HashMap<TaskRef, Assets>,
    retryable: HashMap<PathBuf, RetryFile>,
    created_at: Instant,
}

struct RetryFile {
    identity: Option<same_file::Handle>,
}

#[derive(Default)]
pub struct DeletionState {
    pending: HashMap<String, Pending>,
}

impl DeletionState {
    fn expire_confirmations(&mut self) {
        self.pending
            .retain(|_, pending| pending.created_at.elapsed() < Duration::from_secs(900));
    }
}

static STATE: Lazy<Mutex<DeletionState>> = Lazy::new(|| Mutex::new(DeletionState::default()));

trait Backend: Clone + Send + Sync + 'static {
    fn prepare(&self, task: &TaskRef) -> impl Future<Output = Result<Assets, String>> + Send;
    fn other_files(
        &self,
        selected: &HashSet<TaskRef>,
    ) -> impl Future<Output = Result<HashSet<PathBuf>, String>> + Send;
    fn remove(&self, task: &TaskRef) -> impl Future<Output = Result<(), String>> + Send;
    fn save_session(&self) -> impl Future<Output = Option<String>> + Send;
    fn delete_file(&self, path: &Path, permanent: bool) -> Result<(), String>;
}

#[derive(Clone)]
struct SystemBackend;

impl Backend for SystemBackend {
    async fn prepare(&self, task: &TaskRef) -> Result<Assets, String> {
        prepare(task).await
    }
    async fn other_files(&self, selected: &HashSet<TaskRef>) -> Result<HashSet<PathBuf>, String> {
        other_files(selected).await
    }
    async fn remove(&self, task: &TaskRef) -> Result<(), String> {
        remove(task).await
    }
    async fn save_session(&self) -> Option<String> {
        rpc::<Value>("saveSession", &[]).await.err()
    }
    fn delete_file(&self, path: &Path, permanent: bool) -> Result<(), String> {
        if permanent {
            std::fs::remove_file(path).map_err(|error| error.to_string())
        } else {
            trash::delete(path).map_err(|error| error.to_string())
        }
    }
}

pub async fn control_guard(id: &str) -> Result<MutexGuard<'static, DeletionState>, String> {
    let mut state = STATE.lock().await;
    state.expire_confirmations();
    let task = TaskRef {
        engine: EngineKind::Vortex,
        id: id.into(),
    };
    if state
        .pending
        .values()
        .any(|pending| pending.assets.contains_key(&task))
    {
        return Err("Task deletion is awaiting confirmation".into());
    }
    Ok(state)
}

async fn finish(
    report: &mut DeletionReport,
    assets: &HashMap<TaskRef, Assets>,
    backend: &impl Backend,
) {
    for result in &mut report.tasks {
        if result.stage.is_some() || result.removed {
            continue;
        }
        if let Some(assets) = assets.get(&result.task) {
            if !result.files.is_empty() {
                let assets = assets.clone();
                let _ = tokio::task::spawn_blocking(move || clean_empty_directories(&assets)).await;
            }
        }
        match backend.remove(&result.task).await {
            Ok(()) => result.removed = true,
            Err(error) => {
                result.stage = Some(DeletionStage::Remove);
                result.error = Some(error);
            }
        }
    }
    if report
        .tasks
        .iter()
        .any(|result| result.task.engine == EngineKind::Aria2c)
    {
        report.session_error = backend.save_session().await;
    }
}

pub async fn delete_tasks(
    tasks: Vec<TaskRef>,
    delete_files: bool,
) -> Result<DeletionReport, String> {
    let mut state = STATE.lock().await;
    delete_with(&mut state, tasks, delete_files, SystemBackend).await
}

async fn delete_with(
    state: &mut DeletionState,
    tasks: Vec<TaskRef>,
    delete_files: bool,
    backend: impl Backend,
) -> Result<DeletionReport, String> {
    state.expire_confirmations();
    if tasks.is_empty() {
        return Err("Select at least one task".into());
    }
    let mut selected = HashSet::new();
    let tasks: Vec<_> = tasks
        .into_iter()
        .filter(|task| selected.insert(task.clone()))
        .collect();
    if state
        .pending
        .values()
        .any(|pending| pending.assets.keys().any(|task| selected.contains(task)))
    {
        return Err("Task deletion is already awaiting confirmation".into());
    }
    let mut report = DeletionReport {
        tasks: vec![],
        retry_token: None,
        session_error: None,
    };
    let mut assets = HashMap::new();
    for task in &tasks {
        let mut result = TaskResult {
            task: task.clone(),
            removed: false,
            stage: None,
            error: None,
            files: vec![],
        };
        match backend.prepare(task).await {
            Ok(files) => {
                assets.insert(task.clone(), files);
            }
            Err(error) => {
                result.stage = Some(DeletionStage::Stop);
                result.error = Some(error);
            }
        }
        report.tasks.push(result);
    }
    let mut retryable = HashMap::new();
    if delete_files {
        let stopped = assets.keys().cloned().collect();
        let others = backend.other_files(&stopped).await;
        for result in &mut report.tasks {
            if result.stage.is_some() {
                continue;
            }
            let others = match &others {
                Ok(paths) => paths,
                Err(_) => {
                    result.stage = Some(DeletionStage::Files);
                    result.error =
                        Some("Could not verify file ownership against other tasks".into());
                    continue;
                }
            };
            let files = assets[&result.task].clone();
            let others = others.clone();
            let backend = backend.clone();
            let processed = tokio::task::spawn_blocking(move || {
                files
                    .files
                    .iter()
                    .map(|path| {
                        process_file_with(&files.directory, path, false, &others, |path| {
                            backend.delete_file(path, false)
                        })
                    })
                    .collect::<Vec<_>>()
            })
            .await;
            match processed {
                Ok(processed) => {
                    for (file, identity) in processed {
                        if let Some(identity) = identity {
                            retryable.insert(file.path.clone(), identity);
                        }
                        result.files.push(file);
                    }
                    if result
                        .files
                        .iter()
                        .any(|file| file.outcome == FileOutcome::Failed)
                    {
                        result.stage = Some(DeletionStage::Files);
                    }
                }
                Err(_) => {
                    result.stage = Some(DeletionStage::Files);
                    result.error = Some("File deletion worker failed".into());
                }
            }
        }
    }
    finish(&mut report, &assets, &backend).await;
    if !retryable.is_empty() {
        let token = uuid::Uuid::new_v4().to_string();
        report.retry_token = Some(token.clone());
        state.pending.insert(
            token,
            Pending {
                report: report.clone(),
                assets,
                retryable,
                created_at: Instant::now(),
            },
        );
    }
    Ok(report)
}

pub async fn resolve(token: String, action: Resolution) -> Result<DeletionReport, String> {
    let mut state = STATE.lock().await;
    resolve_with(&mut state, token, action, SystemBackend).await
}

async fn resolve_with(
    state: &mut DeletionState,
    token: String,
    action: Resolution,
    backend: impl Backend,
) -> Result<DeletionReport, String> {
    state.expire_confirmations();
    let mut pending = state
        .pending
        .remove(&token)
        .ok_or("Deletion confirmation is no longer available")?;
    pending.report.retry_token = None;
    if matches!(action, Resolution::DeletePermanently) {
        let selected = pending.assets.keys().cloned().collect();
        let others = backend.other_files(&selected).await;
        for result in &mut pending.report.tasks {
            if result.stage != Some(DeletionStage::Files) {
                continue;
            }
            if let Err(error) = backend.prepare(&result.task).await {
                result.stage = Some(DeletionStage::Stop);
                result.error = Some(error);
                continue;
            }
            let Some(assets) = pending.assets.get(&result.task) else {
                continue;
            };
            let others = match &others {
                Ok(others) => others,
                Err(_) => {
                    result.error = Some("Could not revalidate file ownership".into());
                    continue;
                }
            };
            for file in &mut result.files {
                if file.outcome != FileOutcome::Failed {
                    continue;
                }
                let Some(retry) = pending.retryable.get(&file.path) else {
                    continue;
                };
                match same_file::Handle::from_path(&file.path) {
                    Ok(_) if retry.identity.is_none() => {
                        file.error = Some(
                            "Cannot verify the original file identity; retry task deletion".into(),
                        );
                        continue;
                    }
                    Ok(current) if retry.identity.as_ref() != Some(&current) => {
                        file.error = Some("File was replaced after the deletion request".into());
                        continue;
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                        file.outcome = FileOutcome::Missing;
                        file.error = None;
                        continue;
                    }
                    Err(error) => {
                        file.error = Some(error.to_string());
                        continue;
                    }
                    Ok(_) => (),
                }
                let directory = assets.directory.clone();
                let path = file.path.clone();
                let others = others.clone();
                let backend = backend.clone();
                match tokio::task::spawn_blocking(move || {
                    process_file_with(&directory, &path, true, &others, |path| {
                        backend.delete_file(path, true)
                    })
                })
                .await
                {
                    Ok((processed, _)) => *file = processed,
                    Err(_) => file.error = Some("File deletion worker failed".into()),
                }
            }
            if result.error.is_none()
                && result
                    .files
                    .iter()
                    .all(|file| file.outcome != FileOutcome::Failed)
            {
                result.stage = None;
            }
        }
    }
    finish(&mut pending.report, &pending.assets, &backend).await;
    Ok(pending.report)
}

#[cfg(test)]
mod tests;
