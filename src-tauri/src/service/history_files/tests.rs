use super::*;

#[test]
fn inspections_distinguish_files_directories_and_missing_paths() {
    let directory = tempfile::tempdir().unwrap();
    let file = directory.path().join("download.png");
    fs::write(&file, b"image").unwrap();
    let result = inspect_paths(vec![
        file.to_string_lossy().into_owned(),
        directory.path().to_string_lossy().into_owned(),
        directory
            .path()
            .join("missing")
            .to_string_lossy()
            .into_owned(),
        String::new(),
    ]);
    assert_eq!(result[0].state, FileState::Present);
    assert_eq!(result[0].kind, Some(FileKind::File));
    assert!(result[0].revision.is_some());
    assert_eq!(result[1].kind, Some(FileKind::Directory));
    assert_eq!(result[2].state, FileState::Missing);
    assert_eq!(result[3].state, FileState::Unknown);
}

#[test]
fn permission_errors_do_not_mark_files_as_missing() {
    let result = inspect_result(
        "protected".into(),
        Err(io::Error::from(io::ErrorKind::PermissionDenied)),
    );
    assert_eq!(result.state, FileState::Unknown);
    assert_eq!(result.kind, None);
}

#[test]
fn cached_previews_expire_when_the_source_changes_or_disappears() {
    let directory = tempfile::tempdir().unwrap();
    let file = directory.path().join("download");
    fs::write(&file, b"first").unwrap();
    let first = revision(&fs::metadata(&file).unwrap()).unwrap();
    let mut cache = ThumbnailCache::default();
    cache.insert(&file, first.clone(), Some("preview".into()));
    assert_eq!(cache.get(&file, &first), Some(Some("preview".into())));
    fs::write(&file, b"replacement").unwrap();
    let next = revision(&fs::metadata(&file).unwrap()).unwrap();
    assert!(cache.get(&file, &next).is_none());
    CACHE
        .lock()
        .insert(&file, next.clone(), Some("preview".into()));
    fs::remove_file(&file).unwrap();
    let result = inspect_paths(vec![file.to_string_lossy().into_owned()]);
    assert_eq!(result[0].state, FileState::Missing);
    assert!(CACHE.lock().get(&file, &next).is_none());
    fs::write(&file, b"restored").unwrap();
    assert_eq!(
        inspect_paths(vec![file.to_string_lossy().into_owned()])[0].state,
        FileState::Present
    );
}

#[test]
fn thumbnail_cache_limits_entries_and_memory_and_caches_failures() {
    let mut cache = ThumbnailCache::default();
    cache.insert(Path::new("unsupported"), "1".into(), None);
    assert_eq!(cache.get(Path::new("unsupported"), "1"), Some(None));
    for index in 0..CACHE_ENTRIES + 1 {
        cache.insert(
            Path::new(&index.to_string()),
            "1".into(),
            Some("a".repeat(MAX_PNG_BYTES)),
        );
    }
    assert!(cache.bytes <= CACHE_BYTES);
    assert!(cache.entries.len() <= CACHE_ENTRIES);
    assert!(cache.get(Path::new("0"), "1").is_none());
}

#[test]
fn absent_files_and_relative_paths_have_no_file_image() {
    let directory = tempfile::tempdir().unwrap();
    assert!(thumbnail(directory.path().join("missing").to_str().unwrap()).is_none());
    assert!(thumbnail("relative.png").is_none());
}
