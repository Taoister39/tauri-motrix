use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf};

pub type TaskId = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EngineConfig {
    pub max_tasks: usize,
    pub connections: usize,
}
impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            max_tasks: 3,
            connections: 4,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DownloadRequest {
    pub url: String,
    pub directory: PathBuf,
    pub filename: Option<String>,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    pub referer: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskState {
    Queued,
    Connecting,
    Downloading,
    RetryWaiting,
    Paused,
    Complete,
    Failed,
    Removed,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DownloadError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub retry_after: Option<u64>,
}
impl DownloadError {
    pub(crate) fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            retryable: false,
            retry_after: None,
        }
    }
}
impl std::fmt::Display for DownloadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}
impl std::error::Error for DownloadError {}
impl From<std::io::Error> for DownloadError {
    fn from(e: std::io::Error) -> Self {
        Self::new("filesystem", e.to_string())
    }
}
impl From<sqlx::Error> for DownloadError {
    fn from(e: sqlx::Error) -> Self {
        Self::new("storage", e.to_string())
    }
}
impl From<serde_json::Error> for DownloadError {
    fn from(e: serde_json::Error) -> Self {
        Self::new("state_format", e.to_string())
    }
}
impl From<reqwest::Error> for DownloadError {
    fn from(e: reqwest::Error) -> Self {
        Self {
            code: "network".into(),
            message: e.without_url().to_string(),
            retryable: true,
            retry_after: None,
        }
    }
}
pub type Result<T> = std::result::Result<T, DownloadError>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TaskSnapshot {
    pub id: TaskId,
    pub revision: u64,
    pub state: TaskState,
    pub url: String,
    pub path: PathBuf,
    pub total: Option<u64>,
    pub completed: u64,
    pub speed: u64,
    pub connections: usize,
    pub error: Option<DownloadError>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TaskEvent {
    pub task: TaskSnapshot,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub(crate) struct Record {
    pub version: u8,
    pub task: TaskSnapshot,
    pub request: DownloadRequest,
    pub validator: Option<String>,
    pub chunks: Vec<bool>,
    pub final_hash: Option<String>,
}
