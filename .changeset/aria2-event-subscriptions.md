---
"@tauri-motrix/aria2": patch
---

Normalize cached notification names and keep listeners subscribed after replaying
queued events. Clear queued events before replay to prevent duplicate delivery
during callback reentry.
