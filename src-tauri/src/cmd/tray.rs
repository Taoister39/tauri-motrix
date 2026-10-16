use crate::service::{
    tray::{self, TrayAction},
    tray_control::ControlReport,
};

fn check_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Tray actions are only available in the main window".into());
    }
    Ok(())
}

#[tauri::command]
pub fn take_tray_actions(window: tauri::WebviewWindow) -> Result<Vec<TrayAction>, String> {
    check_window(&window)?;
    Ok(tray::take_actions())
}

#[tauri::command]
pub fn take_tray_reports(window: tauri::WebviewWindow) -> Result<Vec<ControlReport>, String> {
    check_window(&window)?;
    Ok(tray::take_reports())
}
