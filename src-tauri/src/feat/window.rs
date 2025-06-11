use crate::core::{handle, CoreManager};

/// with kill aria2c
pub fn quit(code: Option<i32>) {
    log::debug!(target: "app", "quit code: {:?}", code);

    let app_handle = handle::Handle::global().app_handle().unwrap();

    handle::Handle::global().set_is_exiting();

    // Prioritize closing the window for immediate feedback
    if let Some(window) = handle::Handle::global().get_window() {
        let _ = window.hide();
    }

    // Handle resource cleanup in a separate thread to avoid blocking the main thread
    std::thread::spawn(move || {
        let cleanup_result = clean();
        app_handle.exit(match cleanup_result {
            true => 0,
            false => 1,
        });
    });
}

pub fn clean() -> bool {
    use tokio::time::{timeout, Duration};
    let rt = tokio::runtime::Runtime::new().unwrap();
    let cleanup_result = rt.block_on(async {
        let core_res = timeout(Duration::from_secs(1), CoreManager::global().stop_engine()).await;

        // TODO: more procedure

        core_res.is_ok()
    });
    cleanup_result
}
