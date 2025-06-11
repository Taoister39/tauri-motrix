use anyhow::Result;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Listener, Wry,
};

use crate::{core::handle, feat, utils::window::create_window};

use super::i18n::t;

pub fn create_tray(app_handle: &AppHandle) -> Result<()> {
    let mut builder = TrayIconBuilder::with_id("main")
        .icon(app_handle.default_window_icon().unwrap().clone())
        .icon_as_template(false);

    #[cfg(target_os = "windows")]
    {
        builder = builder.show_menu_on_left_click(false);
    }

    let tray = builder.build(app_handle)?;

    tray.on_menu_event(on_menu_event);

    tray.on_tray_icon_event(on_tray_icon_event);
    Ok(())
}

pub fn update_tray_menu() -> Result<()> {
    let app_handle = handle::Handle::global().app_handle().unwrap();
    let tray = app_handle.tray_by_id("main").unwrap();

    let _ = tray.set_menu(Some(create_tray_menu(&app_handle)?));
    Ok(())
}

fn create_tray_menu(app_handle: &AppHandle) -> Result<Menu<Wry>> {
    let quit_i = MenuItem::with_id(app_handle, "quit", t("common.Exit"), true, None::<&str>)?;

    let add_task = MenuItem::with_id(
        app_handle,
        "add_task",
        t("common.DownloadFile"),
        true,
        None::<&str>,
    )?;

    let menu = tauri::menu::MenuBuilder::new(app_handle)
        .items(&[&quit_i, &add_task])
        .build()
        .unwrap();
    Ok(menu)
}

fn on_menu_event(_: &AppHandle, event: MenuEvent) {
    match event.id.as_ref() {
        "quit" => {
            println!("quit menu item was clicked");
            feat::quit(Some(0));
        }
        "add_task" => {
            println!("add task menu item was clicked");
            let minimized = create_window(true);

            let _ = handle::Handle::global().get_window().map(|window| {
                // Check if window is ready before emitting the event
                let window_clone = window.clone();
                const ADD_TASK_DIALOG: &str = "motrix://open-add-task-dialog";
                let add_fn = move || window_clone.emit(ADD_TASK_DIALOG, ()).unwrap();

                if minimized {
                    add_fn();
                } else {
                    window.once("motrix://web-ready", move |_| {
                        // Now the DOM is ready, we can emit the event
                        add_fn();
                    });
                }
            });
        }
        _ => {
            println!("menu item {:?} not handled", event.id);
        }
    }
}

fn on_tray_icon_event(_: &TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        create_window(true);
    }
}
