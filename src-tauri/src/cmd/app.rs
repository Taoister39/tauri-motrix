// Nothing to do with motrix conf

use std::fs;
use std::path::Path;

use base64::{engine::general_purpose::STANDARD, Engine};

use crate::{
    feat,
    service::{self},
    utils::dirs,
    wrap_err,
};

use super::CmdResult;

#[tauri::command]
pub fn open_logs_dir() -> CmdResult<()> {
    let log_dir = wrap_err!(dirs::app_logs_dir())?;
    wrap_err!(open::that(log_dir))
}

#[tauri::command]
pub fn open_core_dir() -> CmdResult<()> {
    let core_dir = wrap_err!(tauri::utils::platform::current_exe())?;
    let core_dir = core_dir.parent().ok_or("failed to get core dir")?;
    wrap_err!(open::that(core_dir))
}

#[tauri::command]
pub fn open_app_dir() -> CmdResult<()> {
    let app_dir = wrap_err!(dirs::app_home_dir())?;
    wrap_err!(open::that(app_dir))
}

#[tauri::command]
pub fn exit_app() {
    feat::quit(Some(0));
}

#[tauri::command]
pub fn get_auto_launch_status() -> CmdResult<bool> {
    use crate::core::sys_opt::SysOpt;
    wrap_err!(SysOpt::global().get_auto_launch())
}

#[tauri::command]
pub fn app_log(level: String, message: String, location: Option<&str>) -> CmdResult<()> {
    service::log::expose_log_wrap(level, message, location);
    Ok(())
}

/// Read a file from the given path and return its contents as base64.
/// Used when user drops torrent files onto the window (Tauri provides file paths, not File objects).
#[tauri::command]
pub fn read_file_as_base64(path: String) -> CmdResult<String> {
    let path = Path::new(&path);
    if !path.is_file() {
        return Err("Path is not a file".to_string());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(bytes))
}
