pub mod app;
pub mod aria2;
pub mod history_files;
pub mod motrix;
pub mod shortcuts;
pub mod task_deletion;
pub mod tray;
pub mod vortex;

// Re-export all command functions for backwards compatibility
pub use app::*;
pub use aria2::*;
pub use history_files::*;
pub use motrix::*;
pub use shortcuts::*;
pub use task_deletion::*;
pub use tray::*;
pub use vortex::*;
