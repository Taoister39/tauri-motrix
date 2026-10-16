use crate::service::shortcuts::{self, ShortcutStatus};

fn check_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Global shortcuts are only available in the main window".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn get_global_shortcut_status(
    window: tauri::WebviewWindow,
) -> Result<ShortcutStatus, String> {
    check_window(&window)?;
    Ok(shortcuts::status())
}

#[tauri::command]
pub async fn set_global_shortcut_recording(
    window: tauri::WebviewWindow,
    recording: bool,
) -> Result<(), String> {
    check_window(&window)?;
    if recording
        && !window
            .is_focused()
            .map_err(|_| "Unable to read window focus")?
    {
        return Err("Shortcut recording requires window focus".into());
    }
    shortcuts::set_recording(recording);
    Ok(())
}
