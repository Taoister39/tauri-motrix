use anyhow::{Context, Result};
use fs2::FileExt;
use once_cell::sync::OnceCell;
use std::{path::PathBuf, sync::Arc, time::Duration};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tokio::{
    sync::{oneshot, Mutex},
    time::{sleep, timeout, Instant},
};

use crate::{
    config::{Aria2Info, Config, IAria2Temp},
    core::handle,
    log_err, logging,
    utils::{
        dirs::{self, aria2_path},
        logging::Type,
    },
};

#[derive(Debug)]
pub struct CoreManager {
    running: Arc<Mutex<bool>>,
    aria2c_sidecar: Arc<Mutex<Option<CommandChild>>>,
    aria2c_exit: Mutex<Option<oneshot::Receiver<()>>>,
}

impl CoreManager {
    pub fn global() -> &'static CoreManager {
        static CORE_MANGER: OnceCell<CoreManager> = OnceCell::new();
        CORE_MANGER.get_or_init(|| CoreManager {
            running: Arc::new(Mutex::new(false)),
            aria2c_sidecar: Arc::new(Mutex::new(None)),
            aria2c_exit: Mutex::new(None),
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

        self.ensure_port_available().await?;
        self.run_core_by_sidecar(&config_path).await?;
        let info = Config::aria2().data().get_client_info();
        if let Err(error) = Self::wait_for_rpc(&info).await {
            let _ = self.kill_core_by_sidecar().await;
            return Err(error);
        }

        *running = true;

        Ok(())
    }

    pub async fn stop_engine(&self) {
        let mut running = self.running.lock().await;
        if let Err(error) = crate::service::vortex::shutdown().await {
            log::error!("Vortex shutdown failed: {error}");
        }
        // TODO aria2c external control for user
        let _ = self.kill_core_by_sidecar().await;
        *running = false;
    }

    /// Save unfinished tasks and restart only the managed aria2 process.
    pub async fn reconfigure_aria2(&self, config: &IAria2Temp) -> Result<()> {
        let mut running = self.running.lock().await;
        let was_running = *running;
        let previous = Config::aria2().data().clone();
        let old_info = previous.get_client_info();
        let new_info = config.get_client_info();
        if !was_running || old_info.port != new_info.port {
            std::net::TcpListener::bind(("0.0.0.0", new_info.port))
                .with_context(|| format!("RPC port {} is unavailable", new_info.port))?;
        }

        if was_running {
            crate::service::aria2c::call_with_info(&old_info, "saveSession", &[]).await?;
        }
        config.save_file()?;
        let config_path = aria2_path()?;
        let result: Result<()> = async {
            if was_running {
                crate::service::aria2c::call_with_info(&old_info, "forceShutdown", &[]).await?;
                self.wait_for_exit().await?;
                self.aria2c_sidecar.lock().await.take();
                handle::Handle::global().core_lock.write().take();
                *running = false;
            }

            self.run_core_by_sidecar(&config_path).await?;
            Self::wait_for_rpc(&new_info).await?;
            *running = true;
            Ok(())
        }
        .await;

        if let Err(error) = result {
            let recovery: Result<()> = async {
                previous.save_file()?;
                self.kill_core_by_sidecar().await?;
                *running = false;
                if was_running {
                    self.run_core_by_sidecar(&config_path).await?;
                    Self::wait_for_rpc(&old_info).await?;
                    *running = true;
                }
                Ok(())
            }
            .await;
            if let Err(recovery_error) = recovery {
                let _ = self.kill_core_by_sidecar().await;
                *running = false;
                return Err(error.context(format!(
                    "Failed to restore the previous RPC configuration: {recovery_error}"
                )));
            }
            return Err(error);
        }
        Ok(())
    }

    async fn wait_for_rpc(info: &Aria2Info) -> Result<()> {
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            match crate::service::aria2c::call_with_info(info, "getVersion", &[]).await {
                Ok(_) => return Ok(()),
                Err(error) if Instant::now() >= deadline => {
                    return Err(error.context("aria2 RPC did not become ready"))
                }
                Err(_) => sleep(Duration::from_millis(100)).await,
            }
        }
    }

    async fn wait_for_exit(&self) -> Result<()> {
        let mut exit = self.aria2c_exit.lock().await;
        if let Some(receiver) = exit.as_mut() {
            let _ = timeout(Duration::from_secs(10), receiver)
                .await
                .context("Timed out waiting for aria2 to stop")?;
        }
        exit.take();
        Ok(())
    }

    pub async fn ensure_port_available(&self) -> Result<()> {
        let aria2_port = Config::aria2().data().get_client_info().port;

        logging!(
            info,
            Type::Core,
            true,
            "check existing port: {}",
            aria2_port
        );

        std::net::TcpListener::bind(("0.0.0.0", aria2_port))
            .with_context(|| format!("RPC port {aria2_port} is unavailable"))?;
        Ok(())
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

        file.try_lock_exclusive()
            .context("Failed to acquire the aria2 process lock")?;
        logging!(info, Type::Core, true, "acquired lock for core process");

        let app_handle = handle::Handle::global()
            .app_handle()
            .ok_or(anyhow::anyhow!("failed to get app handle"))?;

        let config_path_str = dirs::path_to_str(config_path)?;

        logging!(info, Type::Core, true, "begin start run core process");
        let (mut events, child) = app_handle
            .shell()
            .sidecar(aria2_engine)?
            .args(["--conf-path", config_path_str])
            .spawn()?;
        handle::Handle::global().set_core_lock(file);

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
        let (sender, receiver) = oneshot::channel();
        *self.aria2c_exit.lock().await = Some(receiver);
        tauri::async_runtime::spawn(async move {
            while let Some(event) = events.recv().await {
                if matches!(event, CommandEvent::Terminated(_)) {
                    break;
                }
            }
            let _ = sender.send(());
        });

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
        self.wait_for_exit().await?;
        handle::Handle::global().core_lock.write().take();

        Ok(())
    }
}
