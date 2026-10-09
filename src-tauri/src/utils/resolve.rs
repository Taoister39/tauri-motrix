use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

use crate::{
    config::Config,
    core::{handle, CoreManager},
    feat::run_upnp_mapping,
    log_err,
    service::{aria2c, tray},
    utils::{init, startup::is_autostart, window::create_window},
};

pub async fn resolve_setup(app_handle: &AppHandle) {
    // let version = app.package_info().version.to_string();
    handle::Handle::global().init(app_handle);

    // Create file to fill config if not exist
    log_err!(init::init_config());
    log_err!(init::init_resources());

    // core start engine
    log::trace!(target:"app", "init config");
    log_err!(Config::init_config().await);

    // Refresh existing registrations so upgrades also receive the startup flag.
    // Use the OS status to respect autostart disabled outside the app.
    let autolaunch = app_handle.autolaunch();
    match autolaunch.is_enabled() {
        Ok(true) => log_err!(autolaunch.enable()),
        Ok(false) => {}
        Err(error) => log::error!(target: "app", "Failed to read auto launch status: {error}"),
    }
    if let Err(error) = crate::service::vortex::engine().await {
        log::error!(target: "app", "Vortex initialization failed: {error}");
    }

    log::trace!(target: "app", "launch core");
    log_err!(CoreManager::global().init().await);

    // TODO: temporary
    let motrix = Config::motrix().latest().clone();
    let resume_all_when_app_launched = motrix.auto_resume_all;
    let resume_all_when_app_launched = resume_all_when_app_launched.unwrap_or(false);

    if resume_all_when_app_launched {
        let _ = aria2c::unpause_all().await;
    }
    log_err!(run_upnp_mapping());

    let tray_available = match tray::create_tray(app_handle) {
        Ok(()) => {
            log_err!(tray::update_tray_menu());
            true
        }
        Err(error) => {
            log::error!(target: "app", "Failed to create tray: {error}");
            false
        }
    };

    // Keep the app accessible if this desktop cannot create a tray icon.
    let minimize = Config::motrix()
        .latest()
        .should_minimize_on_launch(is_autostart(std::env::args_os().skip(1)));
    create_window(!minimize || !tray_available);
}
