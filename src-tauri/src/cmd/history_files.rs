use crate::service::history_files::{self, FileInspection};

use super::CmdResult;

#[tauri::command]
pub async fn inspect_history_paths(paths: Vec<String>) -> CmdResult<Vec<FileInspection>> {
    if paths.len() > 128 {
        return Err("Too many history paths".into());
    }
    tauri::async_runtime::spawn_blocking(move || history_files::inspect_paths(paths))
        .await
        .map_err(|_| "Unable to inspect history files".into())
}

#[tauri::command]
pub async fn get_history_thumbnail(path: String) -> CmdResult<Option<String>> {
    let permit = history_files::THUMBNAIL_WORKERS
        .acquire()
        .await
        .map_err(|_| "Thumbnail service is unavailable".to_string())?;
    let result = tauri::async_runtime::spawn_blocking(move || history_files::thumbnail(&path))
        .await
        .map_err(|_| "Unable to generate file preview".into());
    drop(permit);
    result
}
