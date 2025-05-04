use std::sync::Arc;

use anyhow::Result;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use tauri_plugin_autostart::ManagerExt;

use crate::{config::Config, logging, logging_error, utils::logging::Type};

use super::handle::Handle;

pub struct SysOpt {
    /// helps to auto launch the app
    auto_launch: Arc<Mutex<bool>>,
}

impl SysOpt {
    pub fn global() -> &'static SysOpt {
        static SYSOPT: OnceCell<SysOpt> = OnceCell::new();
        SYSOPT.get_or_init(|| SysOpt {
            auto_launch: Arc::new(Mutex::new(false)),
        })
    }

    pub fn get_auto_launch(&self) -> Result<bool> {
        let app_handle = Handle::global().app_handle().unwrap();
        let autostart_manager = app_handle.autolaunch();

        match autostart_manager.is_enabled() {
            Ok(status) => {
                logging!(info, Type::Core, "Auto launch status: {}", status);
                Ok(status)
            }
            Err(e) => {
                logging!(error, Type::Core, "Failed to get auto launch status: {}", e);
                Err(anyhow::anyhow!("Failed to get auto launch status: {}", e))
            }
        }
    }

    pub fn update_launch(&self) -> Result<()> {
        let _lock = self.auto_launch.lock();
        let enable = { Config::motrix().latest().enable_auto_launch };
        let enable = enable.unwrap_or(false);
        let app_handle = Handle::global().app_handle().unwrap();
        let autostart_manager = app_handle.autolaunch();

        log::info!(target: "app", "Setting auto launch to: {}", enable);

        match enable {
            true => {
                let result = autostart_manager.enable();
                if let Err(ref e) = result {
                    log::error!(target: "app", "Failed to enable auto launch: {}", e);
                } else {
                    log::info!(target: "app", "Auto launch enabled successfully");
                }
                logging_error!(Type::Core, true, result);
            }
            false => {
                let result = autostart_manager.disable();
                if let Err(ref e) = result {
                    log::error!(target: "app", "Failed to disable auto launch: {}", e);
                } else {
                    log::info!(target: "app", "Auto launch disabled successfully");
                }
                logging_error!(Type::Core, true, result);
            }
        };

        Ok(())
    }
}
