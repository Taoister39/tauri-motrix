import { invoke } from "@tauri-apps/api/core";

export type ShortcutError =
  | "invalid"
  | "duplicate"
  | "registration_failed"
  | "unregistration_failed"
  | "save_failed"
  | "rollback_failed"
  | "unavailable"
  | "not_ready";

export interface ShortcutStatus {
  available: boolean;
  show_window: { active: boolean; error: ShortcutError | null };
  new_download: { active: boolean; error: ShortcutError | null };
}

export const getGlobalShortcutStatus = () =>
  invoke<ShortcutStatus>("get_global_shortcut_status");

export const setGlobalShortcutRecording = (recording: boolean) =>
  invoke<void>("set_global_shortcut_recording", { recording });

export function shortcutError(error: unknown): ShortcutError {
  const code = String(error);
  return [
    "invalid",
    "duplicate",
    "registration_failed",
    "unregistration_failed",
    "save_failed",
    "rollback_failed",
    "unavailable",
    "not_ready",
  ].includes(code)
    ? (code as ShortcutError)
    : "unavailable";
}
