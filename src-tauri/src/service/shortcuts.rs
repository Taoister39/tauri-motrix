use std::collections::{HashMap, HashSet};

use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::{config::IMotrix, core::handle::Handle, utils::window::create_window};

use super::tray::{self, TrayAction};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ShortcutError {
    Invalid,
    Duplicate,
    RegistrationFailed,
    UnregistrationFailed,
    SaveFailed,
    RollbackFailed,
    Unavailable,
    NotReady,
}

impl std::fmt::Display for ShortcutError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(serde_json::to_value(self).unwrap().as_str().unwrap())
    }
}

impl std::error::Error for ShortcutError {}

#[derive(Clone, Default)]
struct Registrations {
    desired: [Option<Shortcut>; 2],
    registered: HashMap<u32, Shortcut>,
    errors: [Option<ShortcutError>; 2],
}

#[derive(Default)]
struct Runtime {
    available: bool,
    initialized: bool,
    registrations: Registrations,
    recording: bool,
    pressed: HashSet<u32>,
}

static RUNTIME: Lazy<Mutex<Runtime>> = Lazy::new(|| Mutex::new(Runtime::default()));

impl Runtime {
    fn action(&mut self, key: Shortcut, state: ShortcutState) -> Option<usize> {
        if state == ShortcutState::Released {
            self.pressed.remove(&key.id());
            return None;
        }
        if !self.pressed.insert(key.id()) || self.recording {
            return None;
        }
        self.registrations.desired.iter().position(|binding| {
            *binding == Some(key) && self.registrations.registered.contains_key(&key.id())
        })
    }
}

#[derive(Serialize)]
pub struct BindingStatus {
    active: bool,
    error: Option<ShortcutError>,
}

#[derive(Serialize)]
pub struct ShortcutStatus {
    available: bool,
    show_window: BindingStatus,
    new_download: BindingStatus,
}

pub fn status() -> ShortcutStatus {
    let runtime = RUNTIME.lock();
    let binding = |index: usize| BindingStatus {
        active: runtime.registrations.desired[index]
            .is_some_and(|key: Shortcut| runtime.registrations.registered.contains_key(&key.id())),
        error: if !runtime.available {
            Some(ShortcutError::Unavailable)
        } else if !runtime.initialized {
            Some(ShortcutError::NotReady)
        } else {
            runtime.registrations.errors[index]
        },
    };
    ShortcutStatus {
        available: runtime.available,
        show_window: binding(0),
        new_download: binding(1),
    }
}

pub fn set_recording(recording: bool) {
    RUNTIME.lock().recording = recording;
}

pub fn install(app: &AppHandle) {
    #[cfg(target_os = "linux")]
    if std::env::var("XDG_SESSION_TYPE").is_ok_and(|session| session == "wayland") {
        return;
    }
    match app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, key, event| {
                let action = RUNTIME.lock().action(*key, event.state);
                if Handle::global().is_exiting() {
                    return;
                }
                match action {
                    Some(0) => {
                        create_window(true);
                    }
                    Some(1) => tray::dispatch(app, TrayAction::AddTaskFromShortcut),
                    _ => {}
                }
            })
            .build(),
    ) {
        Ok(()) => RUNTIME.lock().available = true,
        Err(error) => log::error!(target: "app", "Global shortcuts are unavailable: {error}"),
    }
}

fn parse(value: Option<&str>) -> Result<Option<Shortcut>, ShortcutError> {
    let value = value.unwrap_or_default().trim();
    if value.is_empty() {
        return Ok(None);
    }
    let shortcut: Shortcut = value.parse().map_err(|_| ShortcutError::Invalid)?;
    let key = shortcut.key.to_string();
    let supported =
        (key.len() == 4 && key.starts_with("Key") && key.as_bytes()[3].is_ascii_uppercase())
            || (key.len() == 6 && key.starts_with("Digit") && key.as_bytes()[5].is_ascii_digit())
            || key
                .strip_prefix('F')
                .and_then(|n| n.parse::<u8>().ok())
                .is_some_and(|n| (1..=24).contains(&n));
    if !supported
        || !shortcut
            .mods
            .intersects(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SUPER)
    {
        return Err(ShortcutError::Invalid);
    }
    Ok(Some(shortcut))
}

pub fn normalize_patch(patch: &mut IMotrix, current: &IMotrix) -> Result<()> {
    for value in [
        &mut patch.global_shortcut_show_window,
        &mut patch.global_shortcut_new_download,
    ] {
        if let Some(text) = value {
            *text = parse(Some(text))?
                .map(|key| key.to_string())
                .unwrap_or_default();
        }
    }
    let desired = [
        parse(
            patch
                .global_shortcut_show_window
                .as_deref()
                .or(current.global_shortcut_show_window.as_deref()),
        )?,
        parse(
            patch
                .global_shortcut_new_download
                .as_deref()
                .or(current.global_shortcut_new_download.as_deref()),
        )?,
    ];
    if desired[0].is_some() && desired[0] == desired[1] {
        return Err(ShortcutError::Duplicate.into());
    }
    Ok(())
}

trait Registry {
    fn register(&self, key: Shortcut) -> Result<(), ShortcutError>;
    fn unregister(&self, key: Shortcut) -> Result<(), ShortcutError>;
}

struct NativeRegistry(AppHandle);

impl Registry for NativeRegistry {
    fn register(&self, key: Shortcut) -> Result<(), ShortcutError> {
        self.0
            .global_shortcut()
            .register(key)
            .map_err(|_| ShortcutError::RegistrationFailed)
    }

    fn unregister(&self, key: Shortcut) -> Result<(), ShortcutError> {
        self.0
            .global_shortcut()
            .unregister(key)
            .map_err(|_| ShortcutError::UnregistrationFailed)
    }
}

fn reconcile(
    registry: &impl Registry,
    active: &mut HashMap<u32, Shortcut>,
    desired: &HashMap<u32, Shortcut>,
) -> Result<(), ShortcutError> {
    for (&id, &key) in desired {
        if !active.contains_key(&id) {
            registry.register(key)?;
            active.insert(id, key);
        }
    }
    for (id, key) in active.clone() {
        if !desired.contains_key(&id) {
            registry.unregister(key)?;
            active.remove(&id);
        }
    }
    Ok(())
}

fn transact(
    registry: &impl Registry,
    registrations: &mut Registrations,
    desired: [Option<Shortcut>; 2],
    persist: impl FnOnce() -> Result<()>,
) -> Result<()> {
    let previous = registrations.clone();
    let target = desired
        .iter()
        .flatten()
        .map(|key| (key.id(), *key))
        .collect();
    let result = reconcile(registry, &mut registrations.registered, &target)
        .and_then(|()| persist().map_err(|_| ShortcutError::SaveFailed));
    if let Err(error) = result {
        let rollback = reconcile(
            registry,
            &mut registrations.registered,
            &previous.registered,
        );
        registrations.errors = previous.errors;
        if rollback.is_err() {
            registrations.errors = [Some(ShortcutError::RollbackFailed); 2];
            return Err(ShortcutError::RollbackFailed.into());
        }
        return Err(error.into());
    }
    registrations.desired = desired;
    registrations.errors = [None; 2];
    Ok(())
}

pub fn update(config: &IMotrix, persist: impl FnOnce() -> Result<()>) -> Result<()> {
    if !RUNTIME.lock().initialized {
        return Err(ShortcutError::NotReady.into());
    }
    let desired = [
        parse(config.global_shortcut_show_window.as_deref())?,
        parse(config.global_shortcut_new_download.as_deref())?,
    ];
    if !RUNTIME.lock().available {
        let current = crate::config::Config::motrix().data().clone();
        let previous = [
            parse(current.global_shortcut_show_window.as_deref())?,
            parse(current.global_shortcut_new_download.as_deref())?,
        ];
        if desired
            .iter()
            .enumerate()
            .any(|(index, key)| key.is_some() && *key != previous[index])
        {
            return Err(ShortcutError::Unavailable.into());
        }
        return persist();
    }
    let app = Handle::global()
        .app_handle()
        .ok_or_else(|| anyhow!(ShortcutError::Unavailable))?;
    // Plugin operations dispatch to the main thread, whose handler also needs RUNTIME.
    let mut registrations = RUNTIME.lock().registrations.clone();
    let result = transact(&NativeRegistry(app), &mut registrations, desired, persist);
    let mut runtime = RUNTIME.lock();
    runtime
        .pressed
        .retain(|id| registrations.registered.contains_key(id));
    runtime.registrations = registrations;
    result
}

fn initialize_bindings(registry: &impl Registry, config: &IMotrix) -> Registrations {
    let mut registrations = Registrations::default();
    for (index, value) in [
        config.global_shortcut_show_window.as_deref(),
        config.global_shortcut_new_download.as_deref(),
    ]
    .into_iter()
    .enumerate()
    {
        let result = parse(value).and_then(|key| {
            registrations.desired[index] = key;
            if let Some(key) = key {
                if registrations.desired[..index].contains(&Some(key)) {
                    registrations.desired[index] = None;
                    return Err(ShortcutError::Duplicate);
                }
                registry.register(key)?;
                registrations.registered.insert(key.id(), key);
            }
            Ok(())
        });
        registrations.errors[index] = result.err();
    }
    registrations
}

pub async fn initialize(app: &AppHandle) {
    let _update = crate::feat::config::MOTRIX_CONFIG_UPDATE.lock().await;
    let config = crate::config::Config::motrix().data().clone();
    if RUNTIME.lock().available {
        let registrations = initialize_bindings(&NativeRegistry(app.clone()), &config);
        RUNTIME.lock().registrations = registrations;
    }
    RUNTIME.lock().initialized = true;
}

pub fn shutdown(app: &AppHandle) {
    if app
        .try_state::<tauri_plugin_global_shortcut::GlobalShortcut<tauri::Wry>>()
        .is_some()
    {
        if let Err(error) = app.global_shortcut().unregister_all() {
            log::error!(target: "app", "Failed to release global shortcuts: {error}");
        }
    }
    *RUNTIME.lock() = Runtime::default();
}

#[cfg(test)]
mod tests;
