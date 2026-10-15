use crate::service::task_deletion::{self, DeletionReport, Resolution, TaskRef};

fn check_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Task deletion is only available in the main window".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn delete_tasks(
    window: tauri::WebviewWindow,
    tasks: Vec<TaskRef>,
    delete_files: bool,
) -> Result<DeletionReport, String> {
    check_window(&window)?;
    task_deletion::delete_tasks(tasks, delete_files).await
}

#[tauri::command]
pub async fn resolve_task_deletion(
    window: tauri::WebviewWindow,
    token: String,
    action: Resolution,
) -> Result<DeletionReport, String> {
    check_window(&window)?;
    task_deletion::resolve(token, action).await
}
