import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { readFileAsBase64 } from "@/services/cmd";

export type TrayAction =
  | { action: "add_task" }
  | { action: "open_torrent"; path: string }
  | { action: "downloads" }
  | { action: "settings" }
  | { action: "check_update" };

export interface TrayReport {
  action: "pause" | "resume";
  succeeded: number;
  failures: Array<{
    engine: "aria2c" | "vortex";
    id: string | null;
    reason: "unavailable" | "control_failed" | "deletion_pending";
  }>;
}

export async function readTorrentFile(path: string) {
  const encoded = await readFileAsBase64(path);
  const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0));
  return new File([bytes], path.replace(/^.*[/\\]/, ""), {
    type: "application/x-bittorrent",
  });
}

export async function connectTray(
  handlers: {
    action: (action: TrayAction) => Promise<void> | void;
    reports: (reports: TrayReport[]) => void;
    changed: () => void;
    error: () => void;
  },
  signal: AbortSignal,
): Promise<UnlistenFn> {
  const window = getCurrentWindow();
  let work = Promise.resolve();
  const actions = () => {
    work = work
      .then(async () => {
        if (signal.aborted) return;
        const pending = await invoke<TrayAction[]>("take_tray_actions");
        for (const action of pending) {
          if (signal.aborted) return;
          try {
            await handlers.action(action);
          } catch {
            handlers.error();
          }
        }
      })
      .catch(() => {
        if (!signal.aborted) handlers.error();
      });
  };
  const reports = () => {
    work = work
      .then(async () => {
        if (
          signal.aborted ||
          !(await window.isVisible()) ||
          (await window.isMinimized())
        )
          return;
        const pending = await invoke<TrayReport[]>("take_tray_reports");
        if (!signal.aborted && pending.length) handlers.reports(pending);
      })
      .catch(() => {
        if (!signal.aborted) handlers.error();
      });
  };
  const subscriptions = await Promise.allSettled([
    listen("motrix://tray-actions", actions),
    listen("motrix://tray-reports", reports),
    listen("motrix://tray-tasks-changed", () => {
      if (!signal.aborted) handlers.changed();
    }),
    window.onFocusChanged(({ payload }) => {
      if (payload) reports();
    }),
  ]);
  const unlisten = () =>
    subscriptions.forEach((result) => {
      if (result.status === "fulfilled") result.value();
    });
  if (
    signal.aborted ||
    subscriptions.some((result) => result.status === "rejected")
  ) {
    unlisten();
    if (!signal.aborted) handlers.error();
    return () => {};
  }
  actions();
  reports();
  return unlisten;
}
