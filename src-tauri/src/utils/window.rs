use crate::{core::handle, logging, utils::logging::Type};

/// create main window
/// return true if window is minimized
pub fn create_window(is_showup: bool) -> bool {
    logging!(info, Type::Window, true, "Creating window");

    let app_handle = handle::Handle::global().app_handle().unwrap();

    if let Some(window) = handle::Handle::global().get_window() {
        logging!(
            info,
            Type::Window,
            true,
            "Found existing window, attempting to restore visibility"
        );

        if window.is_minimized().unwrap_or(false) {
            logging!(
                info,
                Type::Window,
                true,
                "Window is minimized, restoring window state"
            );
            let _ = window.unminimize();
        }
        let _ = window.show();
        let _ = window.set_focus();
        return true;
    }

    #[cfg(target_os = "windows")]
    let window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "main".to_string(),
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Tauri Motrix")
    .inner_size(800.0, 600.0)
    .min_inner_size(500.0, 550.0)
    .decorations(false)
    .maximizable(true)
    .build();

    #[cfg(target_os = "macos")]
    let window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "main".to_string(),
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Tauri Motrix")
    .inner_size(800.0, 600.0)
    .min_inner_size(650.0, 550.0)
    .decorations(true)
    .build();

    match window {
        Ok(window) => {
            logging!(info, Type::Window, true, "Window created successfully");

            if is_showup {
                println!("is showup");
                let _ = window.show();
                let _ = window.set_focus();
            } else {
                let _ = window.hide();
            }
        }
        Err(e) => {
            logging!(
                error,
                Type::Window,
                true,
                "Failed to create window: {:?}",
                e
            );
        }
    };

    false
}
