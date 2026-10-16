use super::*;
use serde_json::json;
use std::sync::{Arc, Mutex as StdMutex};

#[derive(Default)]
struct MockState {
    assets: HashMap<TaskRef, Assets>,
    stop_failures: HashSet<TaskRef>,
    remove_failures: HashSet<TaskRef>,
    recycle_failures: HashSet<PathBuf>,
    delete_failures: HashSet<PathBuf>,
    others: HashSet<PathBuf>,
    removed: Vec<TaskRef>,
    processed: Vec<(PathBuf, bool)>,
    session_error: Option<String>,
    saves: usize,
}

#[tokio::test]
async fn pending_deletions_only_block_controls_for_the_same_engine_and_task() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let selected = task(EngineKind::Aria2c, "shared-id");
    let paths = fixture(&backend, directory.path(), &selected, &["file"]);
    backend
        .0
        .lock()
        .unwrap()
        .recycle_failures
        .insert(paths[0].clone());
    let mut state = DeletionState::default();
    let report = delete_with(&mut state, vec![selected], true, backend)
        .await
        .unwrap();
    assert!(report.retry_token.is_some());
    assert!(state.is_pending(EngineKind::Aria2c, "shared-id"));
    assert!(!state.is_pending(EngineKind::Vortex, "shared-id"));
    assert!(!state.is_pending(EngineKind::Aria2c, "other-id"));
}

#[derive(Clone, Default)]
struct MockBackend(Arc<StdMutex<MockState>>);

impl Backend for MockBackend {
    async fn prepare(&self, task: &TaskRef) -> Result<Assets, String> {
        let state = self.0.lock().unwrap();
        if state.stop_failures.contains(task) {
            return Err("Stop failed".into());
        }
        state.assets.get(task).cloned().ok_or("Unknown task".into())
    }
    async fn other_files(&self, _: &HashSet<TaskRef>) -> Result<HashSet<PathBuf>, String> {
        Ok(self.0.lock().unwrap().others.clone())
    }
    async fn remove(&self, task: &TaskRef) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        if state.remove_failures.contains(task) {
            return Err("Remove failed".into());
        }
        state.removed.push(task.clone());
        Ok(())
    }
    async fn save_session(&self) -> Option<String> {
        let mut state = self.0.lock().unwrap();
        state.saves += 1;
        state.session_error.clone()
    }
    fn delete_file(&self, path: &Path, permanent: bool) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        state.processed.push((path.to_owned(), permanent));
        if if permanent {
            state.delete_failures.contains(path)
        } else {
            state.recycle_failures.contains(path)
        } {
            return Err("Simulated file operation failure".into());
        }
        std::fs::remove_file(path).map_err(|error| error.to_string())
    }
}

fn task(engine: EngineKind, id: &str) -> TaskRef {
    TaskRef {
        engine,
        id: id.into(),
    }
}

fn fixture(
    backend: &MockBackend,
    directory: &Path,
    task: &TaskRef,
    names: &[&str],
) -> Vec<PathBuf> {
    let files = names
        .iter()
        .map(|name| {
            let path = directory.join(name);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(&path, name).unwrap();
            path
        })
        .collect::<Vec<_>>();
    backend.0.lock().unwrap().assets.insert(
        task.clone(),
        Assets {
            directory: directory.to_owned(),
            files: files.clone(),
        },
    );
    files
}

#[tokio::test]
async fn keeping_files_removes_mixed_engine_tasks_and_saves_once() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let aria = task(EngineKind::Aria2c, "aria");
    let vortex = task(EngineKind::Vortex, "vortex");
    let files = fixture(&backend, directory.path(), &aria, &["a", "a.aria2"]);
    fixture(
        &backend,
        directory.path(),
        &vortex,
        &[".vortex-vortex.part"],
    );
    let report = delete_with(
        &mut DeletionState::default(),
        vec![aria, vortex],
        false,
        backend.clone(),
    )
    .await
    .unwrap();
    assert!(report.tasks.iter().all(|result| result.removed));
    assert!(files.iter().all(|path| path.exists()));
    let state = backend.0.lock().unwrap();
    assert!(state.processed.is_empty());
    assert_eq!(state.saves, 1);
}

#[tokio::test]
async fn permanent_confirmation_only_processes_failed_files_once() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let task = task(EngineKind::Aria2c, "task");
    let files = fixture(&backend, directory.path(), &task, &["good", "bad"]);
    backend
        .0
        .lock()
        .unwrap()
        .recycle_failures
        .insert(files[1].clone());
    let mut state = DeletionState::default();
    let report = delete_with(&mut state, vec![task], true, backend.clone())
        .await
        .unwrap();
    assert!(!report.tasks[0].removed);
    assert!(!files[0].exists());
    assert!(files[1].exists());
    let token = report.retry_token.unwrap();
    let resolved = resolve_with(
        &mut state,
        token.clone(),
        Resolution::DeletePermanently,
        backend.clone(),
    )
    .await
    .unwrap();
    assert!(resolved.tasks[0].removed);
    assert_eq!(resolved.tasks[0].files[0].outcome, FileOutcome::Trashed);
    assert_eq!(resolved.tasks[0].files[1].outcome, FileOutcome::Deleted);
    assert_eq!(
        backend.0.lock().unwrap().processed,
        vec![
            (files[0].clone(), false),
            (files[1].clone(), false),
            (files[1].clone(), true)
        ]
    );
    assert!(
        resolve_with(&mut state, token, Resolution::DeletePermanently, backend)
            .await
            .is_err()
    );
}

#[tokio::test]
async fn cancel_keeps_failed_tasks_and_releases_the_pending_request() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let task = task(EngineKind::Vortex, "task");
    let files = fixture(&backend, directory.path(), &task, &["file"]);
    backend
        .0
        .lock()
        .unwrap()
        .recycle_failures
        .insert(files[0].clone());
    let mut state = DeletionState::default();
    let report = delete_with(&mut state, vec![task.clone()], true, backend.clone())
        .await
        .unwrap();
    assert!(delete_with(&mut state, vec![task], true, backend.clone())
        .await
        .is_err());
    let resolved = resolve_with(
        &mut state,
        report.retry_token.unwrap(),
        Resolution::Cancel,
        backend.clone(),
    )
    .await
    .unwrap();
    assert!(!resolved.tasks[0].removed);
    assert!(files[0].exists());
    assert!(state.pending.is_empty());
    assert!(backend.0.lock().unwrap().removed.is_empty());
}

#[tokio::test]
async fn replacement_files_are_not_deleted_by_an_old_confirmation() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let task = task(EngineKind::Vortex, "task");
    let files = fixture(&backend, directory.path(), &task, &["file"]);
    backend
        .0
        .lock()
        .unwrap()
        .recycle_failures
        .insert(files[0].clone());
    let mut state = DeletionState::default();
    let report = delete_with(&mut state, vec![task], true, backend.clone())
        .await
        .unwrap();
    std::fs::rename(&files[0], directory.path().join("original")).unwrap();
    std::fs::write(&files[0], "replacement").unwrap();
    let resolved = resolve_with(
        &mut state,
        report.retry_token.unwrap(),
        Resolution::DeletePermanently,
        backend,
    )
    .await
    .unwrap();
    assert!(!resolved.tasks[0].removed);
    assert_eq!(std::fs::read(&files[0]).unwrap(), b"replacement");
    assert!(resolved.tasks[0].files[0]
        .error
        .as_ref()
        .unwrap()
        .contains("replaced"));
}

#[tokio::test]
async fn stop_and_permanent_deletion_failures_keep_their_tasks() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let stopped = task(EngineKind::Aria2c, "stop-fails");
    let failed = task(EngineKind::Vortex, "files-fail");
    let stopped_files = fixture(&backend, directory.path(), &stopped, &["stopped"]);
    let failed_files = fixture(&backend, directory.path(), &failed, &["failed"]);
    {
        let mut mock = backend.0.lock().unwrap();
        mock.stop_failures.insert(stopped.clone());
        mock.recycle_failures.insert(failed_files[0].clone());
        mock.delete_failures.insert(failed_files[0].clone());
    }
    let mut state = DeletionState::default();
    let report = delete_with(
        &mut state,
        vec![stopped.clone(), failed],
        true,
        backend.clone(),
    )
    .await
    .unwrap();
    assert_eq!(
        report
            .tasks
            .iter()
            .find(|result| result.task == stopped)
            .unwrap()
            .stage,
        Some(DeletionStage::Stop)
    );
    let resolved = resolve_with(
        &mut state,
        report.retry_token.unwrap(),
        Resolution::DeletePermanently,
        backend,
    )
    .await
    .unwrap();
    assert!(resolved.tasks.iter().all(|result| !result.removed));
    assert!(stopped_files[0].exists());
    assert!(failed_files[0].exists());
}

#[tokio::test]
async fn expired_confirmations_release_tasks_without_deleting_remaining_files() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let task = task(EngineKind::Vortex, "task");
    let files = fixture(&backend, directory.path(), &task, &["file"]);
    backend
        .0
        .lock()
        .unwrap()
        .recycle_failures
        .insert(files[0].clone());
    let mut state = DeletionState::default();
    let report = delete_with(&mut state, vec![task], true, backend.clone())
        .await
        .unwrap();
    let token = report.retry_token.unwrap();
    state.pending.get_mut(&token).unwrap().created_at = Instant::now() - Duration::from_secs(901);
    assert!(
        resolve_with(&mut state, token, Resolution::DeletePermanently, backend)
            .await
            .is_err()
    );
    assert!(state.pending.is_empty());
    assert!(files[0].exists());
}

#[test]
fn missing_download_directories_do_not_prevent_task_removal() {
    let root = tempfile::tempdir().unwrap();
    let directory = root.path().join("missing");
    let (result, retry) = process_file_with(
        &directory,
        &directory.join("file"),
        false,
        &HashSet::new(),
        |_| panic!("Missing files must not be processed"),
    );
    assert_eq!(result.outcome, FileOutcome::Missing);
    assert!(retry.is_none());
}

#[tokio::test]
async fn removal_failure_can_be_retried_without_deleting_files_again() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let task = task(EngineKind::Aria2c, "task");
    fixture(&backend, directory.path(), &task, &["file"]);
    backend
        .0
        .lock()
        .unwrap()
        .remove_failures
        .insert(task.clone());
    let mut state = DeletionState::default();
    let report = delete_with(&mut state, vec![task.clone()], true, backend.clone())
        .await
        .unwrap();
    assert_eq!(report.tasks[0].stage, Some(DeletionStage::Remove));
    backend.0.lock().unwrap().remove_failures.clear();
    let retry = delete_with(&mut state, vec![task], true, backend.clone())
        .await
        .unwrap();
    assert!(retry.tasks[0].removed);
    assert_eq!(retry.tasks[0].files[0].outcome, FileOutcome::Missing);
    assert_eq!(backend.0.lock().unwrap().processed.len(), 1);
}

#[tokio::test]
async fn shared_files_are_preserved_and_session_errors_are_separate() {
    let directory = tempfile::tempdir().unwrap();
    let backend = MockBackend::default();
    let task = task(EngineKind::Aria2c, "task");
    let files = fixture(&backend, directory.path(), &task, &["file"]);
    {
        let mut mock = backend.0.lock().unwrap();
        mock.others
            .insert(ownership_key(&dunce::canonicalize(&files[0]).unwrap()));
        mock.session_error = Some("Session save failed".into());
    }
    let report = delete_with(&mut DeletionState::default(), vec![task], true, backend)
        .await
        .unwrap();
    assert_eq!(report.tasks[0].stage, Some(DeletionStage::Files));
    assert!(report.retry_token.is_none());
    assert_eq!(report.session_error.as_deref(), Some("Session save failed"));
    assert!(files[0].exists());
}

#[test]
fn desktop_capabilities_cover_every_registered_application_command() {
    let manifest = include_str!("../../lib.rs");
    let commands = manifest
        .split("tauri::generate_handler![")
        .nth(1)
        .unwrap()
        .split(']')
        .next()
        .unwrap();
    let permissions = [
        include_str!("../../../permissions/task-deletion.toml"),
        include_str!("../../../permissions/tray.toml"),
    ]
    .join("\n");
    let capability: Value =
        serde_json::from_str(include_str!("../../../capabilities/default.json")).unwrap();
    for identifier in [
        "allow-task-deletion",
        "allow-desktop-commands",
        "allow-tray-actions",
        "allow-global-shortcuts",
    ] {
        assert!(
            capability["permissions"]
                .as_array()
                .unwrap()
                .contains(&json!(identifier)),
            "Missing capability for {identifier}"
        );
    }
    for command in commands
        .split(',')
        .map(str::trim)
        .filter_map(|value| value.strip_prefix("cmd::"))
    {
        assert!(
            permissions.contains(&format!("\"{command}\"")),
            "Missing permission for {command}"
        );
    }
}

#[tokio::test]
async fn aria_task_listing_uses_valid_pages_and_includes_large_task_lists() {
    let sample: AriaTask = serde_json::from_value(
        json!({ "gid": "sample", "status": "paused", "dir": "", "files": [] }),
    )
    .unwrap();
    let mut offsets = Vec::new();
    let tasks = collect_aria_tasks("tellWaiting", |params| {
        let offset = params[0].as_u64().unwrap() as usize;
        let count = params[1]
            .as_u64()
            .expect("aria2 list counts must be nonnegative") as usize;
        assert!(count > 0);
        offsets.push(offset);
        std::future::ready(Ok(vec![sample.clone(); count.min(1001 - offset)]))
    })
    .await
    .unwrap();
    assert_eq!(tasks.len(), 1001);
    assert_eq!(offsets, [0, 1000]);
}

#[test]
fn torrent_assets_include_unselected_files_and_only_the_matching_control_file() {
    let root = tempfile::tempdir().unwrap();
    let task: AriaTask = serde_json::from_value(json!({
        "gid": "task", "status": "paused", "dir": root.path(),
        "bittorrent": { "info": { "name": "album" }, "mode": "multi" },
        "files": [{ "path": root.path().join("album/a"), "selected": "true" }, { "path": root.path().join("album/b"), "selected": "false" }]
    })).unwrap();
    let files = aria_assets(&task).unwrap().files;
    assert_eq!(files.len(), 3);
    assert!(files.contains(&root.path().join("album.aria2")));
    assert!(files.contains(&root.path().join("album/b")));
    assert!(!files.contains(&root.path().join("album/a.aria2")));
    let magnet: AriaTask = serde_json::from_value(json!({ "gid": "magnet", "status": "paused", "dir": root.path(), "bittorrent": {}, "files": [{ "path": "" }] })).unwrap();
    assert!(aria_assets(&magnet).unwrap().files.is_empty());
}

#[test]
fn file_validation_rejects_directories_traversal_and_unrelated_paths() {
    let root = tempfile::tempdir().unwrap();
    let outside = tempfile::NamedTempFile::new().unwrap();
    for path in [
        root.path().to_owned(),
        outside.path().to_owned(),
        root.path().join("../outside"),
    ] {
        let (result, retry) = process_file_with(root.path(), &path, false, &HashSet::new(), |_| {
            panic!("Unsafe path reached the file operation")
        });
        assert_eq!(result.outcome, FileOutcome::Failed);
        assert!(retry.is_none());
    }
    assert!(outside.path().exists());
}

#[test]
fn empty_directory_cleanup_preserves_download_root_and_unrelated_files() {
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(directory.path().join("empty/nested")).unwrap();
    std::fs::create_dir_all(directory.path().join("album")).unwrap();
    std::fs::write(directory.path().join("album/unrelated"), "keep").unwrap();
    clean_empty_directories(&Assets {
        directory: directory.path().to_owned(),
        files: vec![
            directory.path().join("empty/nested/gone"),
            directory.path().join("album/gone"),
        ],
    });
    assert!(directory.path().exists());
    assert!(!directory.path().join("empty").exists());
    assert!(directory.path().join("album/unrelated").exists());
}

#[cfg(windows)]
#[test]
fn junctions_cannot_redirect_file_deletion() {
    let root = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    std::fs::write(outside.path().join("keep"), "keep").unwrap();
    let junction = root.path().join("junction");
    let output = std::process::Command::new("cmd")
        .args(["/c", "mklink", "/J"])
        .arg(&junction)
        .arg(outside.path())
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let result = normalized_file(root.path(), &junction.join("keep"));
    std::fs::remove_dir(junction).unwrap();
    assert!(result.is_err());
    assert!(outside.path().join("keep").exists());
}

#[cfg(unix)]
#[test]
fn symbolic_links_cannot_redirect_file_deletion() {
    let root = tempfile::tempdir().unwrap();
    let outside = tempfile::NamedTempFile::new().unwrap();
    let link = root.path().join("link");
    std::os::unix::fs::symlink(outside.path(), &link).unwrap();
    assert!(normalized_file(root.path(), &link).is_err());
    assert!(outside.path().exists());
}

#[cfg(windows)]
#[test]
fn locked_files_fail_recycling_without_permanent_deletion() {
    use std::os::windows::fs::OpenOptionsExt;
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("locked");
    std::fs::write(&path, "keep").unwrap();
    let locked = std::fs::OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(&path)
        .unwrap();
    let (result, _) = process_file_with(root.path(), &path, false, &HashSet::new(), |path| {
        SystemBackend.delete_file(path, false)
    });
    assert_eq!(result.outcome, FileOutcome::Failed);
    assert!(path.exists());
    drop(locked);
}

#[cfg(any(windows, target_os = "linux"))]
#[test]
#[ignore = "Uses the operating system recycle bin on the workspace volume"]
fn system_recycling_on_workspace_volume_never_silently_purges_files() {
    let directory =
        dunce::canonicalize(Path::new(env!("CARGO_MANIFEST_DIR")).join("../target")).unwrap();
    let root = tempfile::tempdir_in(directory).unwrap();
    let path = root
        .path()
        .join(format!("motrix-volume-test-{}", uuid::Uuid::new_v4()));
    std::fs::write(&path, "recoverable fixture").unwrap();
    let (result, _) = process_file_with(root.path(), &path, false, &HashSet::new(), |path| {
        SystemBackend.delete_file(path, false)
    });
    if result.outcome == FileOutcome::Failed {
        assert_eq!(std::fs::read(path).unwrap(), b"recoverable fixture");
        println!("Workspace volume recycling was unavailable; the fixture was retained");
    } else {
        assert_eq!(result.outcome, FileOutcome::Trashed);
        let original = ownership_key(&dunce::simplified(&path));
        let item = trash::os_limited::list()
            .unwrap()
            .into_iter()
            .find(|item| ownership_key(&item.original_path()) == original)
            .expect("Recycled fixture must remain recoverable");
        trash::os_limited::restore_all([item]).unwrap();
        assert_eq!(std::fs::read(path).unwrap(), b"recoverable fixture");
        println!("Workspace volume recycling was supported; the fixture was restored");
    }
}

#[cfg(any(windows, target_os = "linux"))]
#[test]
#[ignore = "Uses the operating system recycle bin and restores the test fixture"]
fn system_recycle_bin_retains_and_restores_the_file() {
    let root = tempfile::tempdir().unwrap();
    let path = root
        .path()
        .join(format!("motrix-deletion-test-{}", uuid::Uuid::new_v4()));
    std::fs::write(&path, "recoverable fixture").unwrap();
    let (result, _) = process_file_with(root.path(), &path, false, &HashSet::new(), |path| {
        SystemBackend.delete_file(path, false)
    });
    assert_eq!(result.outcome, FileOutcome::Trashed, "{:?}", result.error);
    assert!(!path.exists());
    let original = ownership_key(&path);
    let item = trash::os_limited::list()
        .unwrap()
        .into_iter()
        .find(|item| ownership_key(&item.original_path()) == original)
        .expect("Fixture must be recoverable in the system recycle bin");
    trash::os_limited::restore_all([item]).unwrap();
    assert_eq!(std::fs::read(path).unwrap(), b"recoverable fixture");
}
