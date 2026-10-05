use std::{
    collections::BTreeMap,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};
use tauri_motrix_vortex::{DownloadRequest, Engine, EngineConfig, TaskSnapshot, TaskState};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::Mutex,
};

const BLOCK: usize = 8 * 1024 * 1024;
struct Server {
    url: String,
    body: Arc<Vec<u8>>,
    ranges: Arc<Mutex<Vec<String>>>,
    generation: Arc<AtomicUsize>,
    worker: tokio::task::JoinHandle<()>,
}
impl Drop for Server {
    fn drop(&mut self) {
        self.worker.abort();
    }
}
impl Server {
    async fn new(mode: &'static str, size: usize) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/file.bin", listener.local_addr().unwrap());
        let body = Arc::new((0..size).map(|i| (i % 251) as u8).collect::<Vec<_>>());
        let ranges = Arc::new(Mutex::new(vec![]));
        let (data, observed) = (body.clone(), ranges.clone());
        let attempts = Arc::new(AtomicUsize::new(0));
        let generation = Arc::new(AtomicUsize::new(0));
        let revision = generation.clone();
        let worker = tokio::spawn(async move {
            while let Ok((mut socket, _)) = listener.accept().await {
                let (data, observed, attempts, revision) = (
                    data.clone(),
                    observed.clone(),
                    attempts.clone(),
                    revision.clone(),
                );
                tokio::spawn(async move {
                    let mut bytes = vec![];
                    let mut chunk = [0; 4096];
                    while !bytes.ends_with(b"\r\n\r\n") {
                        let Ok(n) = socket.read(&mut chunk).await else {
                            return;
                        };
                        if n == 0 {
                            return;
                        }
                        bytes.extend_from_slice(&chunk[..n]);
                    }
                    let request = String::from_utf8_lossy(&bytes);
                    let range = request.lines().find_map(|line| {
                        line.to_ascii_lowercase()
                            .strip_prefix("range: bytes=")
                            .map(str::to_owned)
                    });
                    let attempt = attempts.fetch_add(1, Ordering::SeqCst);
                    if mode == "unauthorized" || (mode == "retry" && attempt == 0) {
                        let status = if mode == "retry" {
                            "503 Service Unavailable"
                        } else {
                            "401 Unauthorized"
                        };
                        let _ = socket.write_all(format!("HTTP/1.1 {status}\r\nContent-Length: 0\r\nRetry-After: 0\r\nConnection: close\r\n\r\n").as_bytes()).await;
                        return;
                    }
                    if mode == "redirect" && request.starts_with("GET /file.bin ") {
                        let _ = socket.write_all(b"HTTP/1.1 302 Found\r\nLocation: /actual.bin\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").await;
                        return;
                    }
                    let mut start = 0;
                    let mut end = data.len();
                    let mut partial = false;
                    if let Some(range) = &range {
                        observed.lock().await.push(range.clone());
                        if !["ignore", "unknown"].contains(&mode)
                            && !(mode == "change" && range != "0-0")
                            && !data.is_empty()
                        {
                            let (a, b) = range.trim().split_once('-').unwrap();
                            start = a.parse().unwrap();
                            end = b.parse::<usize>().unwrap() + 1;
                            partial = true;
                        }
                    }
                    let status = if partial {
                        "206 Partial Content"
                    } else {
                        "200 OK"
                    };
                    let generation = revision.load(Ordering::SeqCst);
                    let mut headers = format!(
                        "HTTP/1.1 {status}\r\nETag: \"version-{generation}\"\r\nConnection: close\r\n"
                    );
                    if mode != "unknown" {
                        headers.push_str(&format!("Content-Length: {}\r\n", end - start));
                    }
                    if partial {
                        let reported_start = if mode == "invalid" && range.as_deref() != Some("0-0")
                        {
                            start + 1
                        } else {
                            start
                        };
                        headers.push_str(&format!(
                            "Content-Range: bytes {reported_start}-{}/{}\r\n",
                            end - 1,
                            data.len()
                        ));
                    }
                    headers.push_str("\r\n");
                    if socket.write_all(headers.as_bytes()).await.is_err() {
                        return;
                    }
                    let truncate = mode == "disconnect" && attempt == 1;
                    let end = if truncate {
                        (start + 1024).min(end)
                    } else {
                        end
                    };
                    for chunk in data[start..end].chunks(65536) {
                        if mode == "slow" && start >= BLOCK {
                            tokio::time::sleep(Duration::from_millis(3)).await;
                        }
                        let payload = chunk
                            .iter()
                            .map(|b| b.wrapping_add(generation as u8))
                            .collect::<Vec<_>>();
                        if socket.write_all(&payload).await.is_err() {
                            return;
                        }
                    }
                });
            }
        });
        Self {
            url,
            body,
            ranges,
            generation,
            worker,
        }
    }
}
fn request(server: &Server, directory: &std::path::Path) -> DownloadRequest {
    DownloadRequest {
        url: server.url.clone(),
        directory: directory.into(),
        filename: None,
        headers: BTreeMap::new(),
        referer: None,
    }
}
async fn wait(
    engine: &Engine,
    id: &str,
    predicate: impl Fn(&TaskSnapshot) -> bool,
) -> TaskSnapshot {
    tokio::time::timeout(Duration::from_secs(20), async {
        loop {
            let task = engine.get(id).await.unwrap();
            if predicate(&task) {
                return task;
            }
            assert_ne!(task.state, TaskState::Failed, "{:?}", task.error);
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .expect("Task timed out")
}

#[tokio::test]
async fn http_variants_produce_identical_files_without_overwriting() {
    for (mode, size) in [
        ("range", BLOCK + 17),
        ("ignore", 12345),
        ("unknown", 12345),
        ("range", 0),
        ("change", 12345),
        ("invalid", 12345),
        ("redirect", 321),
        ("retry", 321),
        ("disconnect", 12345),
    ] {
        let server = Server::new(mode, size).await;
        let directory = tempfile::tempdir().unwrap();
        tokio::fs::write(directory.path().join("file.bin"), b"keep existing file")
            .await
            .unwrap();
        let engine = Engine::open(directory.path().join("state"), EngineConfig::default())
            .await
            .unwrap();
        let id = engine
            .add(request(&server, directory.path()))
            .await
            .unwrap();
        let task = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
        assert_eq!(
            tokio::fs::read(&task.path).await.unwrap(),
            *server.body,
            "{mode}"
        );
        assert_eq!(
            tokio::fs::read(directory.path().join("file.bin"))
                .await
                .unwrap(),
            b"keep existing file"
        );
        engine.shutdown().await.unwrap();
    }
}

#[tokio::test]
async fn pause_restart_resume_and_remove_preserve_intent_and_checkpoints() {
    let server = Server::new("slow", BLOCK * 3).await;
    let directory = tempfile::tempdir().unwrap();
    let state = directory.path().join("state");
    let config = EngineConfig {
        max_tasks: 1,
        connections: 1,
    };
    let engine = Engine::open(&state, config.clone()).await.unwrap();
    assert!(Engine::open(&state, config.clone()).await.is_err());
    let id = engine
        .add(request(&server, directory.path()))
        .await
        .unwrap();
    wait(&engine, &id, |t| t.completed > BLOCK as u64).await;
    engine.pause(&id).await.unwrap();
    let task = engine.get(&id).await.unwrap();
    assert_eq!(task.state, TaskState::Paused);
    assert!(task.completed >= BLOCK as u64);
    let before = server
        .ranges
        .lock()
        .await
        .iter()
        .filter(|r| *r == "0-8388607")
        .count();
    let removed = engine
        .add(request(&server, directory.path()))
        .await
        .unwrap();
    engine.remove(&removed).await.unwrap();
    engine.shutdown().await.unwrap();
    let engine = Engine::open(&state, config).await.unwrap();
    assert_eq!(engine.get(&id).await.unwrap().state, TaskState::Paused);
    assert!(!engine.list().await.iter().any(|t| t.id == removed));
    engine.resume(&id).await.unwrap();
    let task = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
    assert_eq!(tokio::fs::read(task.path).await.unwrap(), *server.body);
    assert_eq!(
        server
            .ranges
            .lock()
            .await
            .iter()
            .filter(|r| *r == "0-8388607")
            .count(),
        before
    );
    engine.shutdown().await.unwrap();
}

#[tokio::test]
async fn permanent_http_error_is_actionable_and_stays_failed_after_restart() {
    let server = Server::new("unauthorized", 0).await;
    let directory = tempfile::tempdir().unwrap();
    let engine = Engine::open(directory.path().join("state"), EngineConfig::default())
        .await
        .unwrap();
    let id = engine
        .add(request(&server, directory.path()))
        .await
        .unwrap();
    let task = wait(&engine, &id, |t| t.state == TaskState::Failed).await;
    assert_eq!(task.error.unwrap().code, "http_401");
    engine.shutdown().await.unwrap();
    let engine = Engine::open(directory.path().join("state"), EngineConfig::default())
        .await
        .unwrap();
    assert_eq!(engine.get(&id).await.unwrap().state, TaskState::Failed);
    engine.shutdown().await.unwrap();
}

#[tokio::test]
async fn resource_change_discards_old_segments() {
    let server = Server::new("slow", BLOCK * 3).await;
    let directory = tempfile::tempdir().unwrap();
    let engine = Engine::open(
        directory.path().join("state"),
        EngineConfig {
            max_tasks: 1,
            connections: 1,
        },
    )
    .await
    .unwrap();
    let id = engine
        .add(request(&server, directory.path()))
        .await
        .unwrap();
    wait(&engine, &id, |t| t.completed > BLOCK as u64).await;
    engine.pause(&id).await.unwrap();
    server.generation.store(1, Ordering::SeqCst);
    engine.resume(&id).await.unwrap();
    let task = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
    assert_eq!(
        tokio::fs::read(task.path).await.unwrap(),
        server
            .body
            .iter()
            .map(|b| b.wrapping_add(1))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        server
            .ranges
            .lock()
            .await
            .iter()
            .filter(|r| *r == "0-8388607")
            .count(),
        2
    );
    engine.shutdown().await.unwrap();
}

#[tokio::test]
async fn truncated_temporary_file_is_redownloaded() {
    let server = Server::new("slow", BLOCK * 3).await;
    let directory = tempfile::tempdir().unwrap();
    let engine = Engine::open(
        directory.path().join("state"),
        EngineConfig {
            max_tasks: 1,
            connections: 1,
        },
    )
    .await
    .unwrap();
    let id = engine
        .add(request(&server, directory.path()))
        .await
        .unwrap();
    wait(&engine, &id, |t| t.completed > BLOCK as u64).await;
    engine.pause(&id).await.unwrap();
    tokio::fs::OpenOptions::new()
        .write(true)
        .open(directory.path().join(format!(".vortex-{id}.part")))
        .await
        .unwrap()
        .set_len(0)
        .await
        .unwrap();
    engine.resume(&id).await.unwrap();
    let task = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
    assert_eq!(tokio::fs::read(task.path).await.unwrap(), *server.body);
    engine.shutdown().await.unwrap();
}

#[tokio::test]
async fn finalization_recovers_on_either_side_of_the_file_move() {
    for moved in [false, true] {
        let server = Server::new("range", 1024).await;
        let directory = tempfile::tempdir().unwrap();
        let state = directory.path().join("state");
        let engine = Engine::open(&state, EngineConfig::default()).await.unwrap();
        let id = engine
            .add(request(&server, directory.path()))
            .await
            .unwrap();
        let task = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
        engine.shutdown().await.unwrap();
        if !moved {
            tokio::fs::rename(
                &task.path,
                directory.path().join(format!(".vortex-{id}.part")),
            )
            .await
            .unwrap();
        }
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(
                sqlx::sqlite::SqliteConnectOptions::new().filename(state.join("vortex.db")),
            )
            .await
            .unwrap();
        let (json,): (String,) = sqlx::query_as("SELECT record FROM tasks WHERE id=?")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .unwrap();
        let mut record: serde_json::Value = serde_json::from_str(&json).unwrap();
        record["task"]["state"] = "downloading".into();
        sqlx::query("UPDATE tasks SET record=? WHERE id=?")
            .bind(record.to_string())
            .bind(&id)
            .execute(&pool)
            .await
            .unwrap();
        pool.close().await;
        let engine = Engine::open(&state, EngineConfig::default()).await.unwrap();
        let recovered = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
        assert_eq!(recovered.path, task.path);
        assert_eq!(tokio::fs::read(&task.path).await.unwrap(), *server.body);
        engine.shutdown().await.unwrap();
    }
}

// Invoked in a separate process by the crash test, so termination cannot perform cleanup.
#[test]
fn crash_worker() {
    let Ok(directory) = std::env::var("VORTEX_CRASH_DIRECTORY") else {
        return;
    };
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let directory = std::path::PathBuf::from(directory);
        let engine = Engine::open(
            directory.join("state"),
            EngineConfig {
                max_tasks: 1,
                connections: 1,
            },
        )
        .await
        .unwrap();
        let id = engine
            .add(DownloadRequest {
                url: std::env::var("VORTEX_CRASH_URL").unwrap(),
                directory: directory.clone(),
                filename: None,
                headers: BTreeMap::new(),
                referer: None,
            })
            .await
            .unwrap();
        wait(&engine, &id, |t| t.completed > BLOCK as u64).await;
        tokio::fs::write(directory.join("checkpoint-ready"), id)
            .await
            .unwrap();
        std::future::pending::<()>().await;
    });
}

#[tokio::test]
async fn killed_process_recovers_committed_ranges_automatically() {
    let server = Server::new("slow", BLOCK * 8).await;
    let directory = tempfile::tempdir().unwrap();
    let mut child = std::process::Command::new(std::env::current_exe().unwrap())
        .args(["--exact", "crash_worker", "--nocapture"])
        .env("VORTEX_CRASH_DIRECTORY", directory.path())
        .env("VORTEX_CRASH_URL", &server.url)
        .stdout(std::process::Stdio::null())
        .spawn()
        .unwrap();
    let ready = tokio::time::timeout(Duration::from_secs(20), async {
        loop {
            if let Ok(id) =
                tokio::fs::read_to_string(directory.path().join("checkpoint-ready")).await
            {
                break id;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await;
    child.kill().unwrap();
    child.wait().unwrap();
    let id = ready.expect("Child never committed a segment");
    let before = server
        .ranges
        .lock()
        .await
        .iter()
        .filter(|r| *r == "0-8388607")
        .count();
    let engine = Engine::open(directory.path().join("state"), EngineConfig::default())
        .await
        .unwrap();
    let task = wait(&engine, &id, |t| t.state == TaskState::Complete).await;
    assert_eq!(tokio::fs::read(task.path).await.unwrap(), *server.body);
    assert_eq!(
        server
            .ranges
            .lock()
            .await
            .iter()
            .filter(|r| *r == "0-8388607")
            .count(),
        before
    );
    engine.shutdown().await.unwrap();
}
