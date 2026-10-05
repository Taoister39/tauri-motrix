pub mod app;
pub mod aria2;
pub mod motrix;
pub mod vortex;

// Re-export all command functions for backwards compatibility
pub use app::*;
pub use aria2::*;
pub use motrix::*;
pub use vortex::*;
