//! A standalone HTTP download engine. See `examples/download.rs` for usage.
mod engine;
mod model;
mod storage;
mod transfer;
pub use engine::Engine;
pub use model::{
    DownloadError, DownloadRequest, EngineConfig, Result, TaskEvent, TaskId, TaskSnapshot,
    TaskState,
};
