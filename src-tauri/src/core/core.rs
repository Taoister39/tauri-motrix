use anyhow::Result;
use fs2::FileExt;
use once_cell::sync::OnceCell;
use std::{path::PathBuf, sync::Arc, time::Duration};
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use tokio::{sync::Mutex, time::sleep};

use crate::{
    config::Config,
    core::handle,
    log_err, logging,
    utils::{
        dirs::{self, aria2_path},
        logging::Type,
        sys,
    },
};

#[derive(Debug)]
pub struct CoreManager {
    running: Arc<Mutex<bool>>,
    aria2c_sidecar: Arc<Mutex<Option<CommandChild>>>,
}

impl CoreManager {
    pub fn global() -> &'static CoreManager {
        static CORE_MANGER: OnceCell<CoreManager> = OnceCell::new();
        CORE_MANGER.get_or_init(|| CoreManager {
            running: Arc::new(Mutex::new(false)),
            aria2c_sidecar: Arc::new(Mutex::new(None)),
        })
    }

    pub async fn init(&self) -> Result<()> {
        log::trace!("run core start engine");
        log_err!(Self::global().start_engine().await);
        log::trace!("run core end engine");
        Ok(())
    }
    pub async fn start_engine(&self) -> Result<()> {
        let mut running = self.running.lock().await;

        if *running {
            log::info!("engine is running");
            return Ok(());
        }

        let config_path = aria2_path()?;

        self.ensure_port_available().await;
        self.run_core_by_sidecar(&config_path).await?;

        *running = true;

        Ok(())
    }

    pub async fn stop_engine(&self) {
        if let Err(error) = crate::service::vortex::shutdown().await {
            log::error!("Vortex shutdown failed: {error}");
        }
        // TODO aria2c external control for user
        let _ = self.kill_core_by_sidecar().await;
    }

    pub async fn ensure_port_available(&self) {
        let aria2_map = Config::aria2().latest().0.clone();
        let aria2_port = aria2_map
            .get("rpc-listen-port")
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(16801);

        logging!(
            info,
            Type::Core,
            true,
            "check existing port: {}",
            aria2_port
        );

        let occupies = sys::get_occupied_port_pids(aria2_port).await;

        if !occupies.is_empty() {
            logging!(
                info,
                Type::Core,
                true,
                "port {} is already occupied",
                aria2_port
            );
        }

        for pid in occupies {
            logging!(info, Type::Core, true, "try to kill process: {}", pid);
            sys::terminate_process(pid).await;
        }

        logging!(info, Type::Core, true, "waiting for process to exit...");
        sleep(Duration::from_millis(500)).await;
    }

    /// Start core by sidecar
    async fn run_core_by_sidecar(&self, config_path: &PathBuf) -> Result<()> {
        let aria2_engine = { Config::motrix().latest().aria2_engine.clone() };
        let aria2_engine = aria2_engine.unwrap_or("aria2c".into());

        logging!(
            info,
            Type::Core,
            true,
            "starting core {} in sidecar mode",
            aria2_engine
        );

        let lock_file = dirs::app_home_dir()?.join(format!("{}.lock", aria2_engine));
        logging!(info, Type::Core, true, "lock_file path : {:?}", lock_file);
        logging!(info, Type::Core, true, "[sidecar] try to get lock file");

        let file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(&lock_file)?;

        match file.try_lock_exclusive() {
            Ok(_) => {
                logging!(info, Type::Core, true, "acquired lock for core process");
                handle::Handle::global().set_core_lock(file);
            }
            // TODO
            Err(_) => todo!(),
        }

        let app_handle = handle::Handle::global()
            .app_handle()
            .ok_or(anyhow::anyhow!("failed to get app handle"))?;

        let config_path_str = dirs::path_to_str(config_path)?;

        logging!(info, Type::Core, true, "begin start run core process");
        let (_, child) = app_handle
            .shell()
            .sidecar(aria2_engine)?
            .args(["--conf-path", config_path_str])
            .spawn()?;

        // save process id
        logging!(
            info,
            Type::Core,
            true,
            "run core process success, PID: {:?}",
            child.pid()
        );
        // handle::Handle::global().set_core_process(child);
        *self.aria2c_sidecar.lock().await = Some(child);

        sleep(Duration::from_millis(300)).await;

        logging!(info, Type::Core, true, "core started in sidecar mode");

        Ok(())
    }

    async fn kill_core_by_sidecar(&self) -> Result<()> {
        logging!(trace, Type::Core, true, "Stopping core by sidecar");

        if let Some(child) = self.aria2c_sidecar.lock().await.take() {
            let pid = child.pid();
            child.kill()?;
            logging!(
                trace,
                Type::Core,
                true,
                "Stopped core by sidecar pid: {}",
                pid
            );
        }

        Ok(())
    }
}
