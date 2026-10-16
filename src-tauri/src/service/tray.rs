use std::{
    collections::VecDeque,
    sync::atomic::{AtomicBool, Ordering},
};

use anyhow::Result;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Serialize;
use tauri::{
    menu::{Menu, MenuBuilder, MenuEvent, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Wry,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

use crate::{core::handle, feat, utils::window::create_window};

use super::{
    i18n::t,
    tray_control::{self, ControlAction, ControlReport},
};

const ACTIONS_EVENT: &str = "motrix://tray-actions";
const REPORTS_EVENT: &str = "motrix://tray-reports";
const MENU_GROUPS: &[&[(&str, &str)]] = &[
    &[
        ("add_task", "tray.NewDownload"),
        ("open_torrent", "tray.OpenTorrent"),
    ],
    &[
        ("pause_all", "tray.PauseAll"),
        ("resume_all", "tray.ResumeAll"),
    ],
    &[
        ("show", "tray.ShowWindow"),
        ("downloads", "tray.Downloads"),
        ("settings", "tray.Settings"),
    ],
    &[("check_update", "tray.CheckUpdates"), ("quit", "tray.Quit")],
];

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum TrayAction {
    AddTask,
    OpenTorrent { path: String },
    Downloads,
    Settings,
    CheckUpdate,
}

#[derive(Default)]
struct Bridge {
    actions: VecDeque<TrayAction>,
    reports: Vec<ControlReport>,
}

static BRIDGE: Lazy<Mutex<Bridge>> = Lazy::new(|| Mutex::new(Bridge::default()));
static CONTROLLING: AtomicBool = AtomicBool::new(false);
static PICKING: AtomicBool = AtomicBool::new(false);

struct BusyGuard<'a> {
    flag: &'a AtomicBool,
    on_release: fn(),
}

impl<'a> BusyGuard<'a> {
    fn acquire(flag: &'a AtomicBool, on_release: fn()) -> Option<Self> {
        flag.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .ok()
            .map(|_| Self { flag, on_release })
    }
}

impl Drop for BusyGuard<'_> {
    fn drop(&mut self) {
        self.flag.store(false, Ordering::Release);
        (self.on_release)();
    }
}

pub fn take_actions() -> Vec<TrayAction> {
    BRIDGE.lock().actions.drain(..).collect()
}

pub fn take_reports() -> Vec<ControlReport> {
    std::mem::take(&mut BRIDGE.lock().reports)
}

fn dispatch(app: &AppHandle, action: TrayAction) {
    BRIDGE.lock().actions.push_back(action);
    create_window(true);
    if let Err(error) = app.emit_to("main", ACTIONS_EVENT, ()) {
        log::error!(target: "app", "Failed to signal tray actions: {error}");
    }
}

pub fn create_tray(app_handle: &AppHandle) -> Result<()> {
    let icon = app_handle
        .default_window_icon()
        .ok_or_else(|| anyhow::anyhow!("Missing tray icon"))?;
    let mut builder = TrayIconBuilder::with_id("main")
        .icon(icon.clone())
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
    let app = handle::Handle::global()
        .app_handle()
        .ok_or_else(|| anyhow::anyhow!("Application is unavailable"))?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(create_tray_menu(&app)?))?;
    }
    Ok(())
}

fn refresh_menu() {
    if let Err(error) = update_tray_menu() {
        log::error!(target: "app", "Failed to refresh tray menu: {error}");
    }
}

fn create_tray_menu(app: &AppHandle) -> Result<Menu<Wry>> {
    let mut builder = MenuBuilder::new(app);
    for (index, group) in MENU_GROUPS.iter().enumerate() {
        if index > 0 {
            builder = builder.separator();
        }
        for (id, key) in *group {
            let enabled = match *id {
                "pause_all" | "resume_all" => !CONTROLLING.load(Ordering::Acquire),
                "open_torrent" => !PICKING.load(Ordering::Acquire),
                _ => true,
            };
            builder = builder.item(&MenuItem::with_id(app, *id, t(key), enabled, None::<&str>)?);
        }
    }
    Ok(builder.build()?)
}

fn control(app: &AppHandle, action: ControlAction) {
    let Some(guard) = BusyGuard::acquire(&CONTROLLING, refresh_menu) else {
        return;
    };
    refresh_menu();
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let _guard = guard;
        let report = tray_control::run(action).await;
        if !report.failures.is_empty() {
            BRIDGE.lock().reports.push(report);
            if let Err(error) = app
                .notification()
                .builder()
                .title(t("tray.ControlFailedTitle"))
                .body(t("tray.ControlFailedBody"))
                .show()
            {
                log::error!(target: "app", "Failed to show tray notification: {error}");
            }
            let _ = app.emit_to("main", REPORTS_EVENT, ());
        }
        let _ = app.emit_to("main", "motrix://tray-tasks-changed", ());
    });
}

fn pick_torrent(app: &AppHandle) {
    let Some(guard) = BusyGuard::acquire(&PICKING, refresh_menu) else {
        return;
    };
    refresh_menu();
    let callback_app = app.clone();
    app.dialog()
        .file()
        .set_title(t("tray.OpenTorrent"))
        .add_filter(t("tray.TorrentFiles"), &["torrent"])
        .pick_file(move |file| {
            drop(guard);
            if let Some(file) = file {
                match file.into_path() {
                    Ok(path) => dispatch(
                        &callback_app,
                        TrayAction::OpenTorrent {
                            path: path.to_string_lossy().into_owned(),
                        },
                    ),
                    Err(_) => log::error!(target: "app", "Selected torrent is not a local file"),
                }
            }
        });
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id.as_ref() {
        "quit" => feat::quit(Some(0)),
        "add_task" => dispatch(app, TrayAction::AddTask),
        "open_torrent" => pick_torrent(app),
        "pause_all" => control(app, ControlAction::Pause),
        "resume_all" => control(app, ControlAction::Resume),
        "show" => {
            create_window(true);
        }
        "downloads" => dispatch(app, TrayAction::Downloads),
        "settings" => dispatch(app, TrayAction::Settings),
        "check_update" => dispatch(app, TrayAction::CheckUpdate),
        _ => {}
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn busy_controls_reject_duplicates_and_recover_when_finished() {
        let busy = AtomicBool::new(false);
        let guard = BusyGuard::acquire(&busy, || {}).unwrap();
        assert!(BusyGuard::acquire(&busy, || {}).is_none());
        drop(guard);
        assert!(BusyGuard::acquire(&busy, || {}).is_some());
    }

    #[test]
    fn menu_groups_keep_quit_last() {
        let ids: Vec<_> = MENU_GROUPS
            .iter()
            .flat_map(|group| group.iter().map(|(id, _)| *id))
            .collect();
        assert_eq!(
            ids,
            [
                "add_task",
                "open_torrent",
                "pause_all",
                "resume_all",
                "show",
                "downloads",
                "settings",
                "check_update",
                "quit"
            ]
        );
    }

    #[test]
    fn queued_actions_are_consumed_once_in_order() {
        BRIDGE.lock().actions.push_back(TrayAction::AddTask);
        BRIDGE.lock().actions.push_back(TrayAction::OpenTorrent {
            path: "file.torrent".into(),
        });
        assert_eq!(
            take_actions(),
            [
                TrayAction::AddTask,
                TrayAction::OpenTorrent {
                    path: "file.torrent".into()
                }
            ]
        );
        assert!(take_actions().is_empty());
    }
}
