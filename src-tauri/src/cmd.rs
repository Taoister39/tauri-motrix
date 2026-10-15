pub mod app;
pub mod aria2;
pub mod motrix;
pub mod task_deletion;
pub mod vortex;

// Re-export all command functions for backwards compatibility
pub use app::*;
pub use aria2::*;
pub use motrix::*;
pub use task_deletion::*;
pub use vortex::*;
