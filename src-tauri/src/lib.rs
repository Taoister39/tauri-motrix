use tauri_plugin_autostart::MacosLauncher;
use utils::resolve;

mod cmd;
mod config;
mod core;
mod feat;
mod service;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                resolve::resolve_setup(app).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::get_aria2_info,
            cmd::get_aria2_config,
            cmd::get_motrix_config,
            cmd::open_logs_dir,
            cmd::open_app_dir,
            cmd::open_core_dir,
            cmd::patch_motrix_config,
            cmd::exit_app,
            cmd::patch_aria2_config,
            cmd::get_auto_launch_status
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_app_handle, e| match e {
        tauri::RunEvent::ExitRequested { api, code, .. } => {
            if code.is_none() {
                api.prevent_exit();
            }
        }
        _ => {}
    });
}
