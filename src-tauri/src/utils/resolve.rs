use tauri::{App, Manager};

use crate::{
    config::Config,
    core::{handle, CoreManager},
    log_err,
    service::tray,
    utils::init,
};

pub async fn resolve_setup(app: &App) {
    // let version = app.package_info().version.to_string();
    handle::Handle::global().init(app.app_handle());

    // Create file to fill config if not exist
    log_err!(init::init_config());
    log_err!(init::init_resources());

    // core start engine
    log::trace!(target:"app", "init config");
    log_err!(Config::init_config().await);

    log::trace!(target: "app", "launch core");
    log_err!(CoreManager::global().init().await);

    log_err!(tray::create_tray(app));
    log_err!(tray::update_tray_menu());
}
