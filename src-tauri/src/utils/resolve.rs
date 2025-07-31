use tauri::AppHandle;

use crate::{
    config::Config,
    core::{handle, CoreManager},
    feat::run_upnp_mapping,
    log_err,
    service::{aria2c, tray},
    utils::{init, window::create_window},
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

    log::trace!(target: "app", "launch core");
    log_err!(CoreManager::global().init().await);

    // TODO: temporary
    let motrix = Config::motrix().latest().clone();
    let resume_all_when_app_launched = motrix.auto_resume_all;
    let resume_all_when_app_launched = resume_all_when_app_launched.unwrap_or(false);

    if resume_all_when_app_launched {
        let _ = aria2c::unpause_all().await;
    }
    // TODO: temporary
    let enable_upnp = motrix.enable_upnp.unwrap_or(false);
    if enable_upnp {
        let _ = run_upnp_mapping(&motrix);
    }

    log_err!(tray::create_tray(app_handle));
    log_err!(tray::update_tray_menu());

    // create main window
    // TODO: silent startup in feature
    create_window(true);
}
