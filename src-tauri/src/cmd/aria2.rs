use std::collections::HashMap;

use anyhow::Result;

use crate::{
    config::{Aria2Info, Config},
    feat, wrap_err,
};

pub type CmdResult<T = ()> = Result<T, String>;
/// get aria2 config of sidecar
#[tauri::command]
pub async fn get_aria2_info() -> CmdResult<Aria2Info> {
    Ok(Config::aria2().data().get_client_info())
}

#[tauri::command]
pub async fn get_aria2_config() -> CmdResult<HashMap<String, String>> {
    Ok(Config::aria2().latest().clone().0)
}

#[tauri::command]
pub async fn patch_aria2_config(data: HashMap<String, String>) -> CmdResult<()> {
    wrap_err!(feat::patch_aria2(data).await)
}

#[tauri::command]
pub async fn patch_aria2_rpc(port: u16, secret: String) -> CmdResult<Aria2Info> {
    wrap_err!(feat::patch_aria2_rpc(port, secret).await)
}
