import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { DOWNLOAD_ENGINE } from "@/constant/task";
import * as aria2 from "@/services/aria2c_api";
import { getAria2Config, getMotrixConfig } from "@/services/cmd";
import { buildMagnetLink } from "@/utils/task";

export type {
  Aria2File,
  Aria2GlobalStat,
  DownloadOption,
  Peer,
} from "@/services/aria2c_api";
export { addTorrentApi, getAria2, saveSessionApi } from "@/services/aria2c_api";

export interface TaskRef {
  engine: DOWNLOAD_ENGINE;
  id: string;
}
// Retain the existing presentation fields while adapters own native engine data.
export interface DownloadTask extends aria2.Aria2Task {
  ref?: TaskRef;
  revision?: number;
  phase?: VortexSnapshot["state"];
  totalKnown?: boolean;
  capabilities?: { selectFiles: boolean; peers: boolean };
}
export interface VortexSnapshot {
  id: string;
  revision: number;
  state:
    | "queued"
    | "connecting"
    | "downloading"
    | "retry_waiting"
    | "paused"
    | "complete"
    | "failed"
    | "removed";
  url: string;
  path: string;
  total: number | null;
  completed: number;
  speed: number;
  connections: number;
  error: { code: string; message: string; retryable: boolean } | null;
}
export const taskRef = (key: string): TaskRef =>
  key.startsWith("vortex:")
    ? { engine: DOWNLOAD_ENGINE.Vortex, id: key.slice(7) }
    : { engine: DOWNLOAD_ENGINE.Aria2, id: key };

export function fromVortex(task: VortexSnapshot): DownloadTask {
  const path = task.path
    .replace(/^\\\\\?\\UNC\\/, "\\\\")
    .replace(/^\\\\\?\\/, "")
    .replace(/\\/g, "/");
  const status = {
    queued: "waiting",
    connecting: "active",
    downloading: "active",
    retry_waiting: "active",
    paused: "paused",
    complete: "complete",
    failed: "error",
    removed: "removed",
  }[task.state];
  return {
    ref: { engine: DOWNLOAD_ENGINE.Vortex, id: task.id },
    gid: `vortex:${task.id}`,
    revision: task.revision,
    phase: task.state,
    capabilities: { selectFiles: false, peers: false },
    totalKnown: task.total !== null,
    status,
    dir: path.slice(0, path.lastIndexOf("/")),
    completedLength: String(task.completed),
    totalLength: String(task.total ?? 0),
    downloadSpeed: String(task.speed),
    connections: String(task.connections),
    uploadSpeed: "0",
    uploadLength: "0",
    numPieces: "0",
    pieceLength: "0",
    errorCode: task.error?.code,
    errorMessage: task.error?.message,
    files: [
      {
        index: "1",
        path,
        length: String(task.total ?? 0),
        completedLength: String(task.completed),
        selected: "true",
        uris: [{ uri: task.url, status: "used" }],
      },
    ],
  };
}
const fromAria2 = (task: aria2.Aria2Task): DownloadTask => ({
  ...task,
  ref: { engine: DOWNLOAD_ENGINE.Aria2, id: task.gid },
  capabilities: { selectFiles: !!task.bittorrent, peers: !!task.bittorrent },
});
export const listVortex = async () =>
  (await invoke<VortexSnapshot[]>("vortex_list")).map(fromVortex);

async function combined(
  legacy: Promise<aria2.Aria2Task[]>,
  accepts: (task: DownloadTask) => boolean,
) {
  const results = await Promise.allSettled([legacy, listVortex()]);
  if (results.every((r) => r.status === "rejected"))
    throw (results[0] as PromiseRejectedResult).reason;
  const [a, v] = results;
  return [
    ...(a.status === "fulfilled" ? a.value.map(fromAria2) : []),
    ...(v.status === "fulfilled" ? v.value.filter(accepts) : []),
  ];
}
export const downloadingTasksApi = async () =>
  combined(
    aria2.downloadingTasksApi().then((r) => r.flat(2)),
    (t) => ["active", "waiting"].includes(t.status),
  );
export const waitingTasksApi = () =>
  combined(aria2.waitingTasksApi(), (t) =>
    ["paused", "waiting"].includes(t.status),
  );
export const stoppedTasksApi = () =>
  combined(aria2.stoppedTasksApi(), (t) =>
    ["complete", "error", "removed"].includes(t.status),
  );
export async function taskItemApi(key: string): Promise<DownloadTask> {
  const ref = taskRef(key);
  return ref.engine === DOWNLOAD_ENGINE.Vortex
    ? fromVortex(await invoke<VortexSnapshot>("vortex_get", { id: ref.id }))
    : fromAria2(await aria2.taskItemApi(ref.id));
}
export async function addTaskApi(
  urls: string | string[],
  option: aria2.DownloadOption,
) {
  const config = await getMotrixConfig();
  const list = typeof urls === "string" ? [urls] : urls;
  if (
    config?.http_engine !== "vortex" ||
    !list.every((url) => /^https?:\/\//i.test(url))
  )
    return aria2.addTaskApi(urls, option);
  if (list.length !== 1)
    throw new Error(
      "Vortex supports one URL per task; add mirror URLs as separate tasks.",
    );
  const unsupported = Object.keys(option).filter(
    (key) =>
      option[key as keyof typeof option] !== undefined &&
      !["dir", "out", "header", "referer"].includes(key),
  );
  if (unsupported.length)
    throw new Error(
      `Unsupported Vortex options: ${unsupported.join(", ")}. Configure connections in Vortex settings.`,
    );
  const headers: Record<string, string> = {};
  for (const header of option.header ?? []) {
    const separator = header.indexOf(":");
    if (separator <= 0) throw new Error("Invalid download header");
    headers[header.slice(0, separator).trim()] = header
      .slice(separator + 1)
      .trim();
  }
  const directory = option.dir || (await getAria2Config())?.dir || "";
  const id = await invoke<string>("vortex_add", {
    request: {
      url: list[0],
      directory,
      filename: option.out || null,
      headers,
      referer: option.referer || null,
    },
  });
  return `vortex:${id}`;
}
async function control(
  key: string,
  action: string,
  legacy: (id: string) => Promise<unknown>,
) {
  const ref = taskRef(key);
  return ref.engine === DOWNLOAD_ENGINE.Vortex
    ? invoke<void>("vortex_control", { id: ref.id, action })
    : legacy(ref.id);
}
export const pauseTaskApi = (key: string) =>
  control(key, "pause", aria2.pauseTaskApi);
export const forcePauseTaskApi = (key: string) =>
  control(key, "pause", aria2.forcePauseTaskApi);
export const resumeTaskApi = (key: string) =>
  control(key, "resume", aria2.resumeTaskApi);
export async function retryTaskApi(key: string) {
  const ref = taskRef(key);
  if (ref.engine === DOWNLOAD_ENGINE.Vortex)
    return invoke<void>("vortex_control", { id: ref.id, action: "retry" });

  const task = await aria2.taskItemApi(ref.id);
  if (task.status !== "error")
    throw new Error("Only failed tasks can be retried");
  const urls =
    task.bittorrent && task.infoHash
      ? [buildMagnetLink(task, true)]
      : task.files.length === 1
        ? task.files[0].uris.map(({ uri }) => uri)
        : [];
  if (!urls.length) throw new Error("No download URL available for retry");

  const options = await aria2.getOptionApi(ref.id);
  // A new GID is required; keep the original destination and resume partial files.
  delete options.gid;
  const { call } = await aria2.getAria2();
  const gid = await call<string>("addUri", urls, {
    ...options,
    dir: task.dir,
    pause: "false",
    continue: "true",
    "auto-file-renaming": "false",
  });
  // Keep the failed result available until aria2 accepts the replacement.
  await aria2.removeDownloadResultTaskApi(ref.id);
  await aria2.saveSessionApi();
  return gid;
}
export const removeTaskApi = (key: string) =>
  control(key, "remove", aria2.removeTaskApi);
export const removeDownloadResultTaskApi = (key: string) =>
  control(key, "remove", aria2.removeDownloadResultTaskApi);
async function batch(
  keys: string[],
  operation: (key: string) => Promise<unknown>,
) {
  const results = await Promise.allSettled(keys.map(operation));
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length)
    throw new Error(
      `${failures.length} download operation(s) failed: ${(failures[0] as PromiseRejectedResult).reason}`,
    );
}
export const batchPauseTaskApi = (keys: string[]) => batch(keys, pauseTaskApi);
export const batchResumeTaskApi = (keys: string[]) =>
  batch(keys, resumeTaskApi);
export const batchForcePauseTaskApi = (keys: string[]) =>
  batch(keys, forcePauseTaskApi);
export const batchRemoveTaskApi = (keys: string[]) =>
  batch(keys, removeTaskApi);
export const taskItemWithPeers = (key: string) =>
  aria2.taskItemWithPeers(taskRef(key).id);
export const changeOptionApi = (
  key: string,
  option: { "select-file": string },
) => {
  if (taskRef(key).engine === DOWNLOAD_ENGINE.Vortex)
    throw new Error("Vortex file selection is unavailable");
  return aria2.changeOptionApi(key, option);
};
export async function getGlobalStatApi(): Promise<aria2.Aria2GlobalStat> {
  const [legacy, native] = await Promise.allSettled([
    aria2.getGlobalStatApi(),
    listVortex(),
  ]);
  if (legacy.status === "rejected" && native.status === "rejected")
    throw legacy.reason;
  const stat =
    legacy.status === "fulfilled"
      ? legacy.value
      : {
          downloadSpeed: "0",
          uploadSpeed: "0",
          numActive: "0",
          numWaiting: "0",
          numStopped: "0",
        };
  const tasks = native.status === "fulfilled" ? native.value : [];
  return {
    ...stat,
    downloadSpeed: String(
      Number(stat.downloadSpeed) +
        tasks.reduce((sum, t) => sum + Number(t.downloadSpeed), 0),
    ),
    numActive: String(
      Number(stat.numActive) +
        tasks.filter((t) => t.status === "active").length,
    ),
    numWaiting: String(
      Number(stat.numWaiting) +
        tasks.filter((t) => ["waiting", "paused"].includes(t.status)).length,
    ),
    numStopped: String(
      Number(stat.numStopped) +
        tasks.filter((t) => ["complete", "error"].includes(t.status)).length,
    ),
  };
}

let vortexSubscription: Promise<void> | undefined;
export function registerVortexEvents(
  update: (
    task: DownloadTask,
    previous: DownloadTask | undefined,
    initial: boolean,
  ) => Promise<void>,
) {
  return (vortexSubscription ??= (async () => {
    const unlisten: Array<() => void> = [];
    const seen = new Map<string, DownloadTask>();
    let queue = Promise.resolve();
    const accept = (task: DownloadTask, initial: boolean) => {
      queue = queue
        .then(async () => {
          const previous = seen.get(task.gid);
          if (previous && (previous.revision ?? 0) >= (task.revision ?? 0))
            return;
          await update(task, previous, initial);
          seen.set(task.gid, task);
        })
        .catch((error) =>
          console.error("Vortex event synchronization failed", error),
        );
      return queue;
    };
    let initializing = true;
    let syncing: Promise<void> | undefined;
    const resync = () =>
      (syncing ??= (async () => {
        for (const task of await listVortex()) await accept(task, initializing);
      })().finally(() => {
        syncing = undefined;
      }));
    try {
      unlisten.push(
        await listen<{ task: VortexSnapshot }>("vortex-task", ({ payload }) => {
          void accept(fromVortex(payload.task), initializing);
        }),
      );
      unlisten.push(
        await listen("vortex-resync", () => {
          void resync().catch(console.error);
        }),
      );
      await resync();
      initializing = false;
      // Application-lifetime subscription; repairs gaps after WebView suspension.
      setInterval(() => {
        void resync().catch(console.error);
      }, 5000);
    } catch (error) {
      unlisten.forEach((off) => off());
      throw error;
    }
  })().catch((error) => {
    vortexSubscription = undefined;
    throw error;
  }));
}
