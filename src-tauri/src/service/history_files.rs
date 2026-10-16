use std::{
    collections::VecDeque,
    fs::{self, Metadata},
    io,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use base64::{engine::general_purpose::STANDARD, Engine};
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Serialize;
use tokio::sync::Semaphore;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

const THUMBNAIL_SIZE: u32 = 128;
const MAX_PNG_BYTES: usize = 512 * 1024;
const CACHE_BYTES: usize = 8 * 1024 * 1024;
const CACHE_ENTRIES: usize = 128;

pub static THUMBNAIL_WORKERS: Semaphore = Semaphore::const_new(4);
static CACHE: Lazy<Mutex<ThumbnailCache>> = Lazy::new(|| Mutex::new(ThumbnailCache::default()));

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FileState {
    Present,
    Missing,
    Unknown,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FileKind {
    File,
    Directory,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInspection {
    path: String,
    state: FileState,
    kind: Option<FileKind>,
    revision: Option<String>,
}

struct CacheEntry {
    path: PathBuf,
    revision: String,
    image: Option<String>,
}

#[derive(Default)]
struct ThumbnailCache {
    entries: VecDeque<CacheEntry>,
    bytes: usize,
}

impl ThumbnailCache {
    fn get(&mut self, path: &Path, revision: &str) -> Option<Option<String>> {
        let index = self.entries.iter().position(|entry| entry.path == path)?;
        let entry = self.entries.remove(index)?;
        if entry.revision != revision {
            self.bytes -= entry.image.as_ref().map_or(0, String::len);
            return None;
        }
        let image = entry.image.clone();
        self.entries.push_back(entry);
        Some(image)
    }

    fn remove(&mut self, path: &Path) {
        if let Some(index) = self.entries.iter().position(|entry| entry.path == path) {
            if let Some(entry) = self.entries.remove(index) {
                self.bytes -= entry.image.as_ref().map_or(0, String::len);
            }
        }
    }

    fn insert(&mut self, path: &Path, revision: String, image: Option<String>) {
        self.remove(path);
        self.bytes += image.as_ref().map_or(0, String::len);
        self.entries.push_back(CacheEntry {
            path: path.to_owned(),
            revision,
            image,
        });
        while self.bytes > CACHE_BYTES || self.entries.len() > CACHE_ENTRIES {
            if let Some(entry) = self.entries.pop_front() {
                self.bytes -= entry.image.as_ref().map_or(0, String::len);
            }
        }
    }
}

fn revision(metadata: &Metadata) -> Option<String> {
    let modified = metadata.modified().ok()?.duration_since(UNIX_EPOCH).ok()?;
    Some(format!("{}:{}", modified.as_nanos(), metadata.len()))
}

fn valid_path(path: &Path) -> bool {
    path.is_absolute() && path.as_os_str().len() <= 32768
}

fn inspect_result(path: String, result: io::Result<Metadata>) -> FileInspection {
    match result {
        Ok(metadata) => FileInspection {
            path,
            state: FileState::Present,
            kind: if metadata.is_dir() {
                Some(FileKind::Directory)
            } else if metadata.is_file() {
                Some(FileKind::File)
            } else {
                None
            },
            revision: revision(&metadata),
        },
        Err(error) => FileInspection {
            path,
            state: if matches!(
                error.kind(),
                io::ErrorKind::NotFound | io::ErrorKind::NotADirectory
            ) {
                FileState::Missing
            } else {
                FileState::Unknown
            },
            kind: None,
            revision: None,
        },
    }
}

pub fn inspect_paths(paths: Vec<String>) -> Vec<FileInspection> {
    paths
        .into_iter()
        .map(|path| {
            let result = if valid_path(Path::new(&path)) {
                fs::metadata(&path)
            } else {
                Err(io::Error::from(io::ErrorKind::InvalidInput))
            };
            let inspection = inspect_result(path, result);
            let mut cache = CACHE.lock();
            let path = Path::new(&inspection.path);
            if inspection.kind.is_none()
                || cache.entries.iter().any(|entry| {
                    entry.path == path && Some(&entry.revision) != inspection.revision.as_ref()
                })
            {
                cache.remove(path);
            }
            inspection
        })
        .collect()
}

pub fn thumbnail(path: &str) -> Option<String> {
    let path = Path::new(path);
    if !valid_path(path) {
        return None;
    }
    let Ok(metadata) = fs::metadata(path) else {
        CACHE.lock().remove(path);
        return None;
    };
    if !metadata.is_file() && !metadata.is_dir() {
        CACHE.lock().remove(path);
        return None;
    }
    let stamp = revision(&metadata)?;
    if let Some(image) = CACHE.lock().get(path, &stamp) {
        return image;
    }
    #[cfg(target_os = "windows")]
    let png = windows::generate(path);
    #[cfg(target_os = "macos")]
    let png = macos::generate(path);
    #[cfg(target_os = "linux")]
    let png = linux::generate(path);
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let png: Option<Vec<u8>> = None;

    let image = png
        .filter(|bytes| bytes.len() <= MAX_PNG_BYTES)
        .map(|bytes| format!("data:image/png;base64,{}", STANDARD.encode(bytes)));
    if fs::metadata(path)
        .ok()
        .and_then(|value| revision(&value))
        .as_ref()
        != Some(&stamp)
    {
        return None;
    }
    CACHE.lock().insert(path, stamp, image.clone());
    image
}

#[cfg(test)]
mod tests;
