# Update Log

## v0.2.5

### Platform Support

- Added full desktop platform support: Windows, macOS, and Linux, with x64 and ARM64 builds on all three platforms.

### New Features

- Introduced Vortex (Beta), a native Rust download engine for HTTP(S) files, with segmented downloads, pause/resume, automatic retries, and recovery after unexpected shutdowns. Enable it in Settings → Vortex; aria2 remains the default engine and handles torrents and magnet links.
- Added dual-engine task management with shared task lists, download history, and notifications. Switching engines affects new HTTP(S) tasks; existing tasks keep their original engine.
- Added aria2 RPC settings for third-party controllers: customize the port, set or clear the RPC secret, and copy the connection address. Saving settings preserves the task session, restarts aria2, and reconnects automatically. (#34, #45)
- Added a “Minimize to tray on auto launch” setting, disabled by default. When enabled, the app starts in the tray at login; opening it manually still shows the window. (#41)
- Added per-task User-Agent customization for both aria2 and Vortex. Leave it empty to use the engine default. (#35)
- Added drag-and-drop support for multiple `.torrent` files on the Downloading page, with a confirmation dialog and batch task creation. Thanks to [@dongdongmao](https://github.com/dongdongmao) for contributing! ([#43](https://github.com/Taoister39/tauri-motrix/issues/43), [PR #44](https://github.com/Taoister39/tauri-motrix/pull/44))
- Added a Failed task category, visible failure reasons, and retry actions for both engines. aria2 retries preserve download options and resume existing files. (#30)

### Improvements

- Unified URL input and torrent-file import in one Add Task dialog, with shared download options, directory history, and submission behavior.
- Reworked UPnP mapping to run asynchronously in the background, keeping app startup and settings saves responsive. Added automatic lease renewal, failure retries, and cleanup when disabled or on exit; corrected DHT mappings to use UDP.

### Fix Bugs

- Fixed batch deletion of completed, failed, and removed tasks, including selections containing mixed task states. (#31)
- Fixed speed charts flattening above 10 MB/s. Charts now scale to recent peak speeds, retain the latest sample during sampling delays, and clear stale data when reopened. (#32)
- Fixed missing system notifications for failed downloads; notifications now respect the notification setting. (#30)
- Fixed authenticated batch RPC queries and handling of occupied RPC ports.
- Fixed duplicate task submissions and outdated torrent parsing results overwriting a newly selected file.

## v0.2.4

- Support tracker list customization
- Update tracker list every day automatically
- Added app website
- Added lab page
- Support proxy setting for aria2

## v0.2.3

### Fix Bugs

- Fixed the aria2 websocket connection failing when starting the app.
- Fixed the aria2c process being occupied when auto-updating.

### New Features

- Added support for Traditional Chinese and Japanese.

### Last version

- Fixed existing filename not updating in history list
- Supplement basic setting
- Upgrade top of downloading page UI
- Refactor task list filtering by name
- Fixed Motrix app does not single instance

## v0.2.2

- Fixed existing filename not updating in history list
- Supplement basic setting
- Upgrade top of downloading page UI
- Refactor task list filtering by name
- Fixed Motrix app does not single instance

## v0.2.1

- Supplement BT task drawer info
- The aria2 package v1.0

## v0.2.0

- Auto update modal show release info.
- Support download by torrent file and choose files.
- Support small window size UI.
- Add download history.
- Add download by clipboard.
- Add auto check update

## v0.1.2

- Fixed crash when the app init log. (#1)

## v0.1.1

- After updating the language, the menu language will also change.
- Added download of atomic charts in Task Details.
- Auto Launch

## v0.1.0

- 🎨 Material Design Theme (MUI).
- 🚀 Supports 128 threads in a single task
- 📦 Lightweight, small package size
- 🚥 Supports speed limit

---
