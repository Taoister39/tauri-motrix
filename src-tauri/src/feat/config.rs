use std::collections::HashMap;

use anyhow::Result;
use serde_json::json;

use crate::{
    config::{Config, IMotrix},
    core::sys_opt,
    feat, service,
};

// Define update flags as bitflags for better performance
#[derive(Clone, Copy)]
enum UpdateFlags {
    None = 0,
    // RestartCore = 1 << 0,
    // Aria2Config = 1 << 1,
    // MotrixConfig = 1 << 2,
    Launch = 1 << 3,
    TrayMenu = 1 << 4,
}

/// expose outside for motrix config
pub async fn patch_motrix(data: IMotrix) -> Result<()> {
    if data
        .http_engine
        .as_deref()
        .is_some_and(|e| !matches!(e, "aria2c" | "vortex"))
        || data
            .vortex_max_tasks
            .is_some_and(|n| !(1..=32).contains(&n))
        || data
            .vortex_connections
            .is_some_and(|n| !(1..=16).contains(&n))
    {
        anyhow::bail!("Invalid download engine configuration");
    }
    Config::motrix().draft().patch_config(data.clone());

    let language = data.language;
    let auto_launch = data.enable_auto_launch;
    let enable_upnp = data.enable_upnp;
    let bt_listen_port = data.bt_listen_port;
    let dht_listen_port = data.dht_listen_port;

    let upnp_changed =
        enable_upnp.is_some() || bt_listen_port.is_some() || dht_listen_port.is_some();
    let updated_motrix = Config::motrix().draft().clone();
    let res: Result<()> = (|| {
        if upnp_changed {
            feat::create_upnp_mappings(&updated_motrix)?;
        }
        let mut flag_signal: i32 = UpdateFlags::None as i32;

        if language.is_some() {
            flag_signal |= UpdateFlags::TrayMenu as i32;
        }

        if auto_launch.is_some() {
            flag_signal |= UpdateFlags::Launch as i32;
        }

        // ------
        // Process updates based on flags
        if (flag_signal & (UpdateFlags::Launch as i32)) != 0 {
            sys_opt::SysOpt::global().update_launch()?;
        }

        if (flag_signal & (UpdateFlags::TrayMenu as i32)) != 0 {
            service::tray::update_tray_menu()?;
        }

        updated_motrix.save_file()?;
        Ok(())
    })();

    match res {
        Ok(()) => {
            Config::motrix().apply();
            if upnp_changed {
                if let Err(error) = feat::run_upnp_mapping() {
                    log::error!(target: "app", "Failed to submit UPnP configuration: {error}");
                }
            }
            Ok(())
        }
        Err(err) => {
            Config::motrix().discard();
            Err(err)
        }
    }
}

pub async fn patch_aria2(data: HashMap<String, String>) -> Result<()> {
    Config::aria2().draft().patch_config(data.clone());

    // TODO: check conf

    let res = {
        service::aria2c::change_global_option(&[json!(data)]).await?;
        <Result<()>>::Ok(())
    };

    match res {
        Ok(()) => {
            Config::aria2().apply();
            let _ = Config::aria2().data().save_file();

            Ok(())
        }
        Err(err) => {
            Config::aria2().discard();
            Err(err)
        }
    }
}
