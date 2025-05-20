import { Aria2Instance, create, EventSubscribeMap } from "@tauri-motrix/aria2";

import { isTest } from "@/constant/environment";
import { getAria2Info } from "@/services/cmd";

let instancePromise: Promise<Aria2Instance> = null!;

const eventSubscribeMap: EventSubscribeMap = {};

async function getInstancePromise() {
  console.log("aria2", "Initializing instances");

  let server = "";
  const aria2Info = await getAria2Info();

  if (aria2Info.server) {
    server = aria2Info.server;
  } else {
    throw new Error("Server URL is invalid or not retrieved");
  }

  const instance = create({
    server,
    eventSubscribeMap,
  });

  instance.open();

  return instance;
}

export function getAria2(force = false) {
  if (!instancePromise || force) {
    instancePromise?.then(({ close }) => close());
    instancePromise = getInstancePromise();
  }
  return instancePromise;
}

export interface Aria2BitTorrent {
  info: {
    name: string;
  };
  announceList: string[];
}

export interface Aria2Task {
  infoHash?: unknown;
  bittorrent?: Aria2BitTorrent;
  bitfield?: string;
  completedLength: string;
  connections: string;
  dir: string;
  downloadSpeed: string;
  files: Aria2File[];
  gid: string;
  numPieces: string;
  pieceLength: string;
  status: string;
  totalLength: string;
  uploadLength: string;
  uploadSpeed: string;
}

export interface Aria2File {
  completedLength: string;
  index: string;
  length: string;
  path: string;
  selected: string;
  uris: Array<{
    status: string;
    uri: string;
  }>;
}

export const downloadingTasksApi = async (param?: {
  offset?: number;
  num?: number;
}) => {
  const { multiCall } = await getAria2();
  return multiCall<[[Aria2Task[]], [Aria2Task[]]]>([
    {
      method: "tellActive",
      params: [],
    },
    {
      method: "tellWaiting",
      params: [param?.offset ?? 0, param?.num ?? 20],
    },
  ]);
};

export const waitingTasksApi = async (param?: {
  offset?: number;
  num?: number;
}) => {
  const { call } = await getAria2();
  return call<Aria2Task[]>("tellWaiting", param?.offset ?? 0, param?.num ?? 20);
};

export const stoppedTasksApi = async (param?: {
  offset?: number;
  num?: number;
}) => {
  const { call } = await getAria2();
  return call<Aria2Task[]>("tellStopped", param?.offset ?? 0, param?.num ?? 20);
};

export const taskItemApi = async (param: { gid: string }) => {
  const { call } = await getAria2();
  return call<Aria2Task>("tellStatus", param.gid);
};

export interface DownloadOption {
  dir?: string;
  out?: string;
  referer?: string;
  header?: string[];
  maxConnection?: number;
  maxSplit?: number;
  split?: number;
}

export const addTaskApi = async (
  urls: string | string[],
  option: DownloadOption,
) => {
  const { call } = await getAria2();
  return call<string>(
    "addUri",
    typeof urls === "string" ? [urls] : urls,
    option,
  );
};

export interface Aria2GlobalStat {
  downloadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  uploadSpeed: string;
}

export const getGlobalStatApi = async () => {
  const { call } = await getAria2();
  return call<Aria2GlobalStat>("getGlobalStat");
};

export const pauseTaskApi = async (gid: string) => {
  const { call } = await getAria2();
  return call("pause", gid);
};

export const pauseAllTaskApi = async () => {
  const { call } = await getAria2();
  return call("pauseAll");
};

export const forcePauseTaskApi = async (gid: string) => {
  const { call } = await getAria2();
  return call("forcePause", gid);
};

export const batchForcePauseTaskApi = async (gids: string[]) => {
  const { multiCall } = await getAria2();
  return multiCall(
    gids.map((gid) => ({ method: "forcePause", params: [gid] })),
  );
};

export const forcePauseAllTaskApi = async () => {
  const { call } = await getAria2();
  return call("forcePauseAll");
};

export const batchPauseTaskApi = async (gids: string[]) => {
  const { multiCall } = await getAria2();
  return multiCall(gids.map((gid) => ({ method: "pause", params: [gid] })));
};

export const resumeTaskApi = async (gid: string) => {
  const { call } = await getAria2();
  return call("unpause", gid);
};

export const resumeAllTaskApi = async () => {
  const { call } = await getAria2();
  return call("unpauseAll");
};

export const batchResumeTaskApi = async (gids: string[]) => {
  const { multiCall } = await getAria2();
  return multiCall(gids.map((gid) => ({ method: "unpause", params: [gid] })));
};

export const removeTaskApi = async (gid: string) => {
  const { call } = await getAria2();
  return call("remove", gid);
};

export const removeDownloadResultTaskApi = async (gid: string) => {
  const { call } = await getAria2();
  return call("removeDownloadResult", gid);
};

export const batchRemoveTaskApi = async (gids: string[]) => {
  const { multiCall } = await getAria2();
  return multiCall(gids.map((gid) => ({ method: "remove", params: [gid] })));
};

export const getVersionApi = async () => {
  const { call } = await getAria2();
  return call<{ version: string; enabledFeatures: string[] }>("getVersion");
};

export const getOptionApi = async (gid: string) => {
  const { call } = await getAria2();
  return call<Aria2Option>("getGlobalOption", gid);
};

export const saveSessionApi = async () => {
  const { call } = await getAria2();
  return call<"OK">("saveSession");
};

if (!isTest) {
  getAria2().then(({ listMethods, listNotifications }) => {
    listMethods().then((res) => console.log("aria2 methods: ", res));
    listNotifications().then((res) =>
      console.log("aria2 notifications: ", res),
    );
  });
}
