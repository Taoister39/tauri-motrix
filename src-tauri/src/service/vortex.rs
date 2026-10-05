use crate::{config::Config, core::handle::Handle, utils::dirs};
use tauri::Emitter;
use tauri_motrix_vortex::{Engine, EngineConfig};
use tokio::sync::OnceCell;

static ENGINE: OnceCell<Engine> = OnceCell::const_new();

pub async fn engine() -> Result<&'static Engine, String> {
    ENGINE
        .get_or_try_init(|| async {
            let config = Config::motrix().latest().clone();
            let path = dirs::app_home_dir()
                .map_err(|e| e.to_string())?
                .join("vortex");
            let engine = Engine::open(
                path,
                EngineConfig {
                    max_tasks: config.vortex_max_tasks.unwrap_or(3),
                    connections: config.vortex_connections.unwrap_or(4),
                },
            )
            .await
            .map_err(|e| e.to_string())?;
            let mut events = engine.subscribe();
            if let Some(app) = Handle::global().app_handle() {
                tauri::async_runtime::spawn(async move {
                    loop {
                        match events.recv().await {
                            Ok(event) => {
                                let _ = app.emit("vortex-task", event);
                            }
                            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                                let _ = app.emit("vortex-resync", ());
                            }
                            Err(_) => break,
                        }
                    }
                });
            }
            Ok(engine)
        })
        .await
}
pub async fn shutdown() -> Result<(), String> {
    if let Some(engine) = ENGINE.get() {
        engine.shutdown().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}
