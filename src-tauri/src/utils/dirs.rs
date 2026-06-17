use std::{fs::create_dir, path::PathBuf};

use anyhow::Result;
use once_cell::sync::OnceCell;
use tauri::Manager;

use crate::core::handle;

pub static APP_ID: &str = "com.tauri-motrix.app";
pub static MOTRIX_CONFIG: &str = "motrix.yaml";
pub static ARIA2_CONFIG: &str = "aria2.conf";

pub static PORTABLE_FLAG: OnceCell<bool> = OnceCell::new();

pub fn app_home_dir() -> Result<PathBuf> {
    use tauri::utils::platform::current_exe;

    let flag = PORTABLE_FLAG.get().unwrap_or(&false);

    if *flag {
        let app_exe = current_exe()?;
        let app_exe = dunce::canonicalize(app_exe)?;

        let app_dir = app_exe
            .parent()
            .ok_or(anyhow::anyhow!("failed to get the portable app dir"))?;

        return Ok(PathBuf::from(app_dir).join(".config").join(APP_ID));
    }

    let app_handle = handle::Handle::global().app_handle().unwrap();

    match app_handle.path().data_dir() {
        Ok(dir) => Ok(dir.join(APP_ID)),
        Err(e) => {
            log::error!(target:"app", "Failed to get the app home directory: {}", e);
            Err(anyhow::anyhow!("Failed to get the app homedirectory"))
        }
    }
}

pub fn app_resources_dir() -> Result<PathBuf> {
    let app_handle = handle::Handle::global().app_handle().unwrap();

    match app_handle.path().resource_dir() {
        Ok(dir) => Ok(dir.join("resources")),
        Err(e) => {
            log::error!(target:"app", "Failed to get the resource directory: {}", e);
            Err(anyhow::anyhow!("Failed to get the resource directory"))
        }
    }
}

pub fn app_logs_dir() -> Result<PathBuf> {
    Ok(app_home_dir()?.join("logs"))
}

pub fn user_downloads_dir() -> Result<PathBuf> {
    let app_handle = handle::Handle::global().app_handle().unwrap();

    match app_handle.path().download_dir() {
        Ok(dir) => Ok(dir),
        Err(e) => {
            let user_dir = app_handle.path().home_dir()?;
            let user_downloads_dir = user_dir.join(".tauri-motrix-downloads");

            if user_downloads_dir.exists() {
                return Ok(user_downloads_dir);
            }

            log::warn!(target:"app", "download_dir() failed: {}, falling back to {:?}", e, user_downloads_dir);

            create_dir(&user_downloads_dir)
                .map_err(|create_err| {
                    log::error!(target:"app", "Failed to create fallback downloads dir: {}", create_err);
                    anyhow::anyhow!("Failed to get or create the user downloads directory")
                })?;

            Ok(user_downloads_dir)
        }
    }
}

pub fn locales_dir() -> Option<PathBuf> {
    app_resources_dir()
        .map(|resource_path| resource_path.join("locales"))
        .ok()
}

pub fn motrix_path() -> Result<PathBuf> {
    Ok(app_home_dir()?.join(MOTRIX_CONFIG))
}

pub fn aria2_path() -> Result<PathBuf> {
    Ok(app_home_dir()?.join(ARIA2_CONFIG))
}

pub fn aria2_download_session_path() -> Result<PathBuf> {
    Ok(app_home_dir()?.join("aria2-download.session"))
}

pub fn path_to_str(path: &PathBuf) -> Result<&str> {
    let path_str = path
        .as_os_str()
        .to_str()
        .ok_or(anyhow::anyhow!("failed to get path from {:?}", path))?;
    Ok(path_str)
}
