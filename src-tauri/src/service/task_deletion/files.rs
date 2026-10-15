use super::*;
use std::path::Component;

fn is_link(metadata: &std::fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    {
        false
    }
}

pub(super) fn ownership_key(path: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        PathBuf::from(dunce::simplified(path).to_string_lossy().to_lowercase())
    }
    #[cfg(not(windows))]
    {
        path.to_owned()
    }
}

pub(super) fn normalized_file(directory: &Path, path: &Path) -> Result<PathBuf, String> {
    if !directory.is_absolute()
        || !path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::ParentDir))
        || directory
            .components()
            .any(|part| matches!(part, Component::ParentDir))
    {
        return Err("Download paths must be absolute and must not contain parent traversal".into());
    }
    let directory = dunce::simplified(directory);
    let path = dunce::simplified(path);
    let relative = path
        .strip_prefix(directory)
        .map_err(|_| "File is outside the task download directory")?;
    if relative.as_os_str().is_empty() {
        return Err("Cannot delete the download directory".into());
    }
    let canonical_root = match dunce::canonicalize(directory) {
        Ok(root) => root,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => directory.to_owned(),
        Err(error) => return Err(error.to_string()),
    };
    let mut current = directory.to_path_buf();
    if std::fs::symlink_metadata(&current).is_ok_and(|metadata| is_link(&metadata)) {
        return Err("Linked download directories cannot be deleted".into());
    }
    for part in relative.components() {
        if !matches!(part, Component::Normal(_)) {
            return Err("Invalid download file path".into());
        }
        #[cfg(windows)]
        if part.as_os_str().to_string_lossy().contains(':') {
            return Err("Alternate data streams cannot be deleted".into());
        }
        current.push(part);
        match std::fs::symlink_metadata(&current) {
            Ok(metadata) if is_link(&metadata) => {
                return Err("Symbolic links and reparse points cannot be deleted".into())
            }
            Ok(_) => (),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(dunce::canonicalize(path).unwrap_or_else(|_| canonical_root.join(relative)))
}

pub(super) fn process_file_with(
    directory: &Path,
    path: &Path,
    permanent: bool,
    others: &HashSet<PathBuf>,
    operation: impl FnOnce(&Path) -> Result<(), String>,
) -> (FileResult, Option<RetryFile>) {
    let mut result = FileResult {
        path: path.to_owned(),
        outcome: FileOutcome::Failed,
        error: None,
    };
    let normalized = match normalized_file(directory, path) {
        Ok(path) => path,
        Err(error) => {
            result.error = Some(error);
            return (result, None);
        }
    };
    if others.contains(&ownership_key(&normalized)) {
        result.error = Some("File is referenced by another task outside this selection".into());
        return (result, None);
    }
    match std::fs::symlink_metadata(path) {
        Ok(metadata) if !metadata.is_file() => {
            result.error = Some("Task file path is not a regular file".into());
            return (result, None);
        }
        Ok(_) => (),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            result.outcome = FileOutcome::Missing;
            return (result, None);
        }
        Err(error) => {
            result.error = Some(error.to_string());
            return (result, None);
        }
    }
    let identity = same_file::Handle::from_path(path).ok();
    let outcome = operation(path);
    match outcome {
        Ok(()) => {
            result.outcome = if permanent {
                FileOutcome::Deleted
            } else {
                FileOutcome::Trashed
            }
        }
        Err(error) => result.error = Some(error),
    }
    let retryable = if result.error.is_some() && !permanent {
        Some(RetryFile { identity })
    } else {
        None
    };
    (result, retryable)
}

pub(super) fn clean_empty_directories(assets: &Assets) {
    for path in &assets.files {
        let mut parent = path.parent();
        while let Some(directory) = parent {
            if directory == assets.directory || !directory.starts_with(&assets.directory) {
                break;
            }
            if std::fs::symlink_metadata(directory).is_ok_and(|metadata| is_link(&metadata)) {
                break;
            }
            if std::fs::remove_dir(directory).is_err() {
                break;
            }
            parent = directory.parent();
        }
    }
}
