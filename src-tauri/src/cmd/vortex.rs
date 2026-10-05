use crate::service::vortex::engine;
use tauri_motrix_vortex::{DownloadRequest, TaskId, TaskSnapshot};

#[tauri::command]
pub async fn vortex_add(mut request: DownloadRequest) -> Result<TaskId, String> {
    if request.directory.as_os_str().is_empty() {
        request.directory = crate::utils::dirs::user_downloads_dir().map_err(|e| e.to_string())?;
    }
    engine()
        .await?
        .add(request)
        .await
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn vortex_list() -> Result<Vec<TaskSnapshot>, String> {
    Ok(engine().await?.list().await)
}
#[tauri::command]
pub async fn vortex_get(id: String) -> Result<TaskSnapshot, String> {
    engine().await?.get(&id).await.map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn vortex_control(id: String, action: String) -> Result<(), String> {
    let engine = engine().await?;
    let result = match action.as_str() {
        "pause" => engine.pause(&id).await,
        "resume" => engine.resume(&id).await,
        "retry" => engine.retry(&id).await,
        "remove" => engine.remove(&id).await,
        _ => return Err("Unknown Vortex action".into()),
    };
    result.map_err(|e| e.to_string())
}
