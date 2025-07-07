use crate::{
    config::{Config, IMotrix},
    feat, wrap_err,
};

use super::CmdResult;

#[tauri::command]
pub fn get_motrix_config() -> CmdResult<IMotrix> {
    Ok(Config::motrix().latest().clone())
}

#[tauri::command]
pub async fn patch_motrix_config(data: IMotrix) -> CmdResult<()> {
    wrap_err!(feat::patch_motrix(data).await)
}

#[tauri::command]
pub async fn stop_engine() -> CmdResult<()> {
    crate::core::CoreManager::global().stop_engine().await;
    Ok(())
}
