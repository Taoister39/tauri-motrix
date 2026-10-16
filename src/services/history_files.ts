import { invoke } from "@tauri-apps/api/core";

export interface HistoryFileInspection {
  path: string;
  state: "present" | "missing" | "unknown";
  kind: "file" | "directory" | null;
  revision: string | null;
}

export const inspectHistoryPaths = (paths: string[]) =>
  invoke<HistoryFileInspection[]>("inspect_history_paths", { paths });

const pending = new Map<string, Promise<string | null>>();
const queue: (() => void)[] = [];
let active = 0;

function drain() {
  while (active < 4 && queue.length > 0) {
    queue.shift()?.();
  }
}

export function getHistoryThumbnail(path: string, revision: string) {
  const key = JSON.stringify([path, revision]);
  const existing = pending.get(key);
  if (existing) return existing;

  const request = new Promise<string | null>((resolve, reject) => {
    queue.push(() => {
      active += 1;
      invoke<string | null>("get_history_thumbnail", { path })
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          pending.delete(key);
          drain();
        });
    });
  });
  pending.set(key, request);
  drain();
  return request;
}
