use super::*;
use crate::service::{aria2c, vortex};
use serde::de::DeserializeOwned;
use serde_json::json;
use std::path::Component;
use std::time::Duration;

#[derive(Clone, Deserialize)]
struct AriaFile {
    path: PathBuf,
}

#[derive(Clone, Deserialize)]
struct TorrentInfo {
    name: String,
}

#[derive(Clone, Deserialize)]
struct Torrent {
    info: Option<TorrentInfo>,
    mode: Option<String>,
}

#[derive(Clone, Deserialize)]
pub(super) struct AriaTask {
    gid: String,
    status: String,
    dir: PathBuf,
    files: Vec<AriaFile>,
    bittorrent: Option<Torrent>,
}

pub(super) async fn rpc<T: DeserializeOwned>(name: &str, params: &[Value]) -> Result<T, String> {
    let response = aria2c::call(name, params)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_value(
        response
            .get("result")
            .cloned()
            .ok_or("Missing aria2 response result")?,
    )
    .map_err(|_| "Invalid aria2 response".into())
}

pub(super) fn aria_assets(task: &AriaTask) -> Result<Assets, String> {
    let files: Vec<_> = task
        .files
        .iter()
        .filter(|f| !f.path.as_os_str().is_empty())
        .map(|f| f.path.clone())
        .collect();
    let mut assets = files.clone();
    if let Some(torrent) = &task.bittorrent {
        if let Some(info) = &torrent.info {
            if torrent.mode.as_deref() == Some("multi") || files.len() > 1 {
                if !single_component(&info.name) {
                    return Err("Invalid torrent directory name".into());
                }
                assets.push(task.dir.join(format!("{}.aria2", info.name)));
            } else {
                assets.extend(files.iter().map(|path| append_control_extension(path)));
            }
        }
    } else {
        assets.extend(files.iter().map(|path| append_control_extension(path)));
    }
    assets.sort();
    assets.dedup();
    Ok(Assets {
        directory: task.dir.clone(),
        files: assets,
    })
}

fn append_control_extension(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".aria2");
    PathBuf::from(name)
}

fn single_component(name: &str) -> bool {
    !name.is_empty()
        && !name.contains(['/', '\\', ':'])
        && Path::new(name).components().count() == 1
        && matches!(
            Path::new(name).components().next(),
            Some(Component::Normal(_))
        )
}

pub(super) async fn prepare(task: &TaskRef) -> Result<Assets, String> {
    match task.engine {
        EngineKind::Vortex => {
            let assets = vortex::engine()
                .await?
                .removal_assets(&task.id)
                .await
                .map_err(|e| e.to_string())?;
            Ok(Assets {
                directory: assets.directory,
                files: assets.files,
            })
        }
        EngineKind::Aria2c => {
            let mut current: AriaTask = rpc("tellStatus", &[json!(task.id)]).await?;
            if matches!(current.status.as_str(), "active" | "waiting") {
                let _: Value = rpc("forcePause", &[json!(task.id)]).await?;
                let mut stopped = false;
                for _ in 0..50 {
                    current = rpc("tellStatus", &[json!(task.id)]).await?;
                    if matches!(
                        current.status.as_str(),
                        "paused" | "complete" | "error" | "removed"
                    ) {
                        stopped = true;
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
                if !stopped {
                    return Err("Timed out waiting for download writes to stop".into());
                }
            }
            if !matches!(
                current.status.as_str(),
                "paused" | "complete" | "error" | "removed"
            ) {
                return Err("Download is not stopped".into());
            }
            aria_assets(&current)
        }
    }
}

pub(super) async fn other_files(selected: &HashSet<TaskRef>) -> Result<HashSet<PathBuf>, String> {
    let mut files = HashSet::new();
    for method in ["tellActive", "tellWaiting", "tellStopped"] {
        let tasks = aria_tasks(method).await?;
        for task in tasks {
            if !selected.contains(&TaskRef {
                engine: EngineKind::Aria2c,
                id: task.gid.clone(),
            }) {
                for path in aria_assets(&task)?.files {
                    files.insert(path);
                }
            }
        }
    }
    for task in vortex::engine().await?.list().await {
        if selected.contains(&TaskRef {
            engine: EngineKind::Vortex,
            id: task.id.clone(),
        }) {
            continue;
        }
        let Some(dir) = task.path.parent() else {
            continue;
        };
        if task.state == tauri_motrix_vortex::TaskState::Complete {
            files.insert(task.path.clone());
        }
        files.insert(dir.join(format!(".vortex-{}.part", task.id)));
    }
    tokio::task::spawn_blocking(move || {
        files
            .into_iter()
            .filter_map(|path| dunce::canonicalize(path).ok())
            .map(|path| ownership_key(&path))
            .collect()
    })
    .await
    .map_err(|_| "File ownership worker failed".into())
}

pub(super) async fn remove(task: &TaskRef) -> Result<(), String> {
    match task.engine {
        EngineKind::Vortex => vortex::engine()
            .await?
            .remove_with_file_retention(&task.id, true)
            .await
            .map_err(|e| e.to_string()),
        EngineKind::Aria2c => {
            let current: AriaTask = rpc("tellStatus", &[json!(task.id)]).await?;
            let method = if matches!(current.status.as_str(), "complete" | "error" | "removed") {
                "removeDownloadResult"
            } else {
                "remove"
            };
            let _: Value = rpc(method, &[json!(task.id)]).await?;
            if method == "remove" {
                for _ in 0..50 {
                    let current = find_aria_task(&task.id).await?;
                    let Some(current) = current else {
                        return Ok(());
                    };
                    if matches!(current.status.as_str(), "removed" | "complete" | "error") {
                        let _: Value = rpc("removeDownloadResult", &[json!(task.id)]).await?;
                        return Ok(());
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
                return Err("Timed out waiting for task removal".into());
            }
            Ok(())
        }
    }
}

async fn find_aria_task(id: &str) -> Result<Option<AriaTask>, String> {
    for method in ["tellActive", "tellWaiting", "tellStopped"] {
        let tasks = aria_tasks(method).await?;
        if let Some(task) = tasks.into_iter().find(|task| task.gid == id) {
            return Ok(Some(task));
        }
    }
    Ok(None)
}

async fn aria_tasks(method: &str) -> Result<Vec<AriaTask>, String> {
    collect_aria_tasks(method, |params| async move { rpc(method, &params).await }).await
}

pub(super) async fn collect_aria_tasks<F, Fut>(
    method: &str,
    mut list: F,
) -> Result<Vec<AriaTask>, String>
where
    F: FnMut(Vec<Value>) -> Fut,
    Fut: Future<Output = Result<Vec<AriaTask>, String>>,
{
    if method == "tellActive" {
        return list(vec![]).await;
    }
    let mut tasks = Vec::new();
    loop {
        let page = list(vec![json!(tasks.len()), json!(1000)]).await?;
        let finished = page.len() < 1000;
        tasks.extend(page);
        if finished {
            return Ok(tasks);
        }
    }
}
