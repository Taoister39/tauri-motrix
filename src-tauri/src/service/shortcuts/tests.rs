use std::cell::RefCell;

use super::*;

#[derive(Default)]
struct FakeRegistry {
    active: RefCell<HashSet<u32>>,
    reject_register: RefCell<HashSet<u32>>,
    reject_unregister: RefCell<HashSet<u32>>,
}

impl Registry for FakeRegistry {
    fn register(&self, key: Shortcut) -> Result<(), ShortcutError> {
        if self.reject_register.borrow().contains(&key.id()) {
            return Err(ShortcutError::RegistrationFailed);
        }
        assert!(self.active.borrow_mut().insert(key.id()));
        Ok(())
    }

    fn unregister(&self, key: Shortcut) -> Result<(), ShortcutError> {
        if self.reject_unregister.borrow().contains(&key.id()) {
            return Err(ShortcutError::UnregistrationFailed);
        }
        assert!(self.active.borrow_mut().remove(&key.id()));
        Ok(())
    }
}

fn config(show: &str, download: &str) -> IMotrix {
    IMotrix {
        global_shortcut_show_window: Some(show.into()),
        global_shortcut_new_download: Some(download.into()),
        ..Default::default()
    }
}

fn key(value: &str) -> Shortcut {
    parse(Some(value)).unwrap().unwrap()
}

#[test]
fn legacy_config_defaults_unbound_and_clear_survives_unrelated_patches() {
    let mut current: IMotrix = serde_yaml::from_str("theme_mode: light").unwrap();
    assert!(current.global_shortcut_show_window.is_none());
    current.patch_config(config("Ctrl+M", "Alt+N"));
    current.patch_config(IMotrix {
        global_shortcut_show_window: Some(String::new()),
        ..Default::default()
    });
    current.patch_config(IMotrix {
        theme_mode: Some("dark".into()),
        ..Default::default()
    });
    let saved: IMotrix = serde_yaml::from_str(&serde_yaml::to_string(&current).unwrap()).unwrap();
    assert_eq!(saved.global_shortcut_show_window.as_deref(), Some(""));
    assert_eq!(saved.global_shortcut_new_download.as_deref(), Some("Alt+N"));
}

#[test]
fn shortcuts_normalize_aliases_and_reject_duplicates_or_unsupported_keys() {
    let mut patch = config("Ctrl+Shift+M", "");
    normalize_patch(&mut patch, &IMotrix::default()).unwrap();
    assert_eq!(
        patch.global_shortcut_show_window.as_deref(),
        Some("shift+control+KeyM")
    );
    assert!(normalize_patch(&mut config("Ctrl+M", "control+KeyM"), &IMotrix::default()).is_err());
    for value in ["M", "Shift+M", "Ctrl+Enter", "Ctrl+F25", "Ctrl+M+N"] {
        assert_eq!(parse(Some(value)), Err(ShortcutError::Invalid));
    }
    assert!(parse(Some("Alt+F24")).unwrap().is_some());
}

#[test]
fn startup_keeps_the_other_action_when_a_registration_fails() {
    let registry = FakeRegistry::default();
    registry
        .reject_register
        .borrow_mut()
        .insert(key("Ctrl+M").id());
    let registrations = initialize_bindings(&registry, &config("Ctrl+M", "Alt+N"));
    assert_eq!(
        registrations.errors,
        [Some(ShortcutError::RegistrationFailed), None]
    );
    assert_eq!(registry.active.borrow().len(), 1);
    assert!(registry.active.borrow().contains(&key("Alt+N").id()));
}

#[test]
fn startup_rejects_duplicates_even_if_the_first_binding_failed() {
    let registry = FakeRegistry::default();
    registry
        .reject_register
        .borrow_mut()
        .insert(key("Ctrl+M").id());
    let registrations = initialize_bindings(&registry, &config("Ctrl+M", "control+KeyM"));
    assert_eq!(
        registrations.errors,
        [
            Some(ShortcutError::RegistrationFailed),
            Some(ShortcutError::Duplicate)
        ]
    );
    assert!(registry.active.borrow().is_empty());
}

#[test]
fn registration_conflict_preserves_the_old_binding_and_skips_persistence() {
    let registry = FakeRegistry::default();
    let mut registrations = initialize_bindings(&registry, &config("Ctrl+M", ""));
    registry
        .reject_register
        .borrow_mut()
        .insert(key("Ctrl+N").id());
    assert!(transact(
        &registry,
        &mut registrations,
        [Some(key("Ctrl+N")), None],
        || panic!("Must not save a conflicting shortcut")
    )
    .is_err());
    assert_eq!(registrations.desired, [Some(key("Ctrl+M")), None]);
    assert_eq!(
        *registry.active.borrow(),
        HashSet::from([key("Ctrl+M").id()])
    );
}

#[test]
fn save_failure_restores_original_registrations_and_clear_releases_the_binding() {
    let registry = FakeRegistry::default();
    let mut registrations = initialize_bindings(&registry, &config("Ctrl+M", ""));
    let result = transact(
        &registry,
        &mut registrations,
        [Some(key("Ctrl+N")), None],
        || Err(anyhow!("Disk full")),
    );
    assert_eq!(result.unwrap_err().to_string(), "save_failed");
    assert_eq!(
        *registry.active.borrow(),
        HashSet::from([key("Ctrl+M").id()])
    );
    transact(&registry, &mut registrations, [None, None], || Ok(())).unwrap();
    assert!(registry.active.borrow().is_empty());
    assert_eq!(registrations.desired, [None, None]);
}

#[test]
fn release_failure_cancels_the_change_and_removes_the_new_registration() {
    let registry = FakeRegistry::default();
    let mut registrations = initialize_bindings(&registry, &config("Ctrl+M", ""));
    registry
        .reject_unregister
        .borrow_mut()
        .insert(key("Ctrl+M").id());
    let result = transact(
        &registry,
        &mut registrations,
        [Some(key("Ctrl+N")), None],
        || panic!("Must not persist after release failure"),
    );
    assert_eq!(result.unwrap_err().to_string(), "unregistration_failed");
    assert_eq!(
        *registry.active.borrow(),
        HashSet::from([key("Ctrl+M").id()])
    );
}

#[test]
fn rollback_failure_tracks_actual_registrations_without_activating_unsaved_actions() {
    let registry = FakeRegistry::default();
    let mut registrations = initialize_bindings(&registry, &config("Ctrl+M", ""));
    let result = transact(
        &registry,
        &mut registrations,
        [Some(key("Ctrl+N")), None],
        || {
            registry
                .reject_register
                .borrow_mut()
                .insert(key("Ctrl+M").id());
            Err(anyhow!("Disk full"))
        },
    );
    assert_eq!(result.unwrap_err().to_string(), "rollback_failed");
    assert_eq!(
        registrations.errors,
        [Some(ShortcutError::RollbackFailed); 2]
    );
    assert!(!registrations.registered.contains_key(&key("Ctrl+M").id()));
    let mut runtime = Runtime {
        registrations,
        ..Default::default()
    };
    assert_eq!(runtime.action(key("Ctrl+N"), ShortcutState::Pressed), None);
}

#[test]
fn pressed_keys_fire_once_and_recording_suppresses_actions_until_release() {
    let registry = FakeRegistry::default();
    let mut runtime = Runtime {
        registrations: initialize_bindings(&registry, &config("Ctrl+M", "Alt+N")),
        ..Default::default()
    };
    let shortcut = key("Ctrl+M");
    assert_eq!(runtime.action(shortcut, ShortcutState::Pressed), Some(0));
    assert_eq!(runtime.action(shortcut, ShortcutState::Pressed), None);
    runtime.action(shortcut, ShortcutState::Released);
    runtime.recording = true;
    assert_eq!(runtime.action(shortcut, ShortcutState::Pressed), None);
    runtime.recording = false;
    assert_eq!(runtime.action(shortcut, ShortcutState::Pressed), None);
    runtime.action(shortcut, ShortcutState::Released);
    assert_eq!(runtime.action(shortcut, ShortcutState::Pressed), Some(0));
}
