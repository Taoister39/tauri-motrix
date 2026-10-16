import "@/services/i18n";

import { sendNotification } from "@tauri-apps/plugin-notification";
import { create } from "@tauri-motrix/aria2";

import { Notice } from "@/components/Notice";
import { APP_LOG_LEVEL } from "@/constant/log";
import { appLog } from "@/services/cmd";
import { type DownloadTask, getAria2, taskItemApi } from "@/services/download";
import { useTaskStore } from "@/store/task";

jest.mock("@tauri-apps/plugin-notification", () => ({
  sendNotification: jest.fn(),
}));
jest.mock("@/components/Notice", () => ({
  Notice: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/services/cmd", () => ({
  appLog: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/services/download", () => ({
  getAria2: jest.fn(),
  taskItemApi: jest.fn(),
  registerVortexEvents: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/store/polling", () => ({
  usePollingStore: { getState: () => ({ resetInterval: jest.fn() }) },
}));

const events = [
  "onDownloadStart",
  "onDownloadPause",
  "onDownloadStop",
  "onDownloadComplete",
  "onDownloadError",
  "onBtDownloadComplete",
] as const;
const task: DownloadTask = {
  gid: "task",
  status: "complete",
  dir: "C:/Downloads",
  files: [
    {
      index: "1",
      path: "C:/Downloads/archive.zip",
      length: "100",
      completedLength: "100",
      selected: "true",
      uris: [{ uri: "https://example.com/archive.zip", status: "used" }],
    },
  ],
  completedLength: "100",
  totalLength: "100",
  connections: "0",
  downloadSpeed: "0",
  uploadSpeed: "0",
  uploadLength: "0",
  numPieces: "1",
  pieceLength: "100",
};
const torrent: DownloadTask = {
  ...task,
  status: "active",
  infoHash: "abc123",
  bittorrent: { info: { name: "archive" }, announceList: [] },
};
const initialState = useTaskStore.getState();
let client: Awaited<ReturnType<typeof getAria2>>;
const fetchTasks = jest.fn().mockResolvedValue(undefined);
const syncToDownloadHistory = jest.fn().mockResolvedValue(undefined);

async function emit(event: (typeof events)[number]) {
  const listeners = client.eventSubscribeMap[`aria2.${event}`];
  if (!listeners?.length) throw new Error(`Missing listener: ${event}`);
  await Promise.all(listeners.map((callback) => callback([{ gid: task.gid }])));
}

beforeEach(async () => {
  jest.clearAllMocks();
  client = create();
  jest.mocked(getAria2).mockResolvedValue(client);
  jest.mocked(taskItemApi).mockReset().mockResolvedValue(task);
  fetchTasks.mockReset().mockResolvedValue(undefined);
  syncToDownloadHistory.mockReset().mockResolvedValue(undefined);
  jest.mocked(appLog).mockReset().mockResolvedValue(null);
  useTaskStore.setState(
    { ...initialState, fetchTasks, syncToDownloadHistory },
    true,
  );
  await useTaskStore.getState().registerEvent();
});

afterEach(() => {
  useTaskStore.setState(initialState, true);
});

it("registers all six events once across repeated registration", async () => {
  await useTaskStore.getState().registerEvent();
  expect(Object.keys(client.eventSubscribeMap).sort()).toEqual(
    events.map((event) => `aria2.${event}`).sort(),
  );
  for (const callbacks of Object.values(client.eventSubscribeMap)) {
    expect(callbacks).toHaveLength(1);
  }
  await emit("onDownloadStart");
  expect(Notice.success).toHaveBeenCalledTimes(1);
  expect(syncToDownloadHistory).toHaveBeenCalledTimes(1);
});

it("refreshes and saves an external pause without showing a notification", async () => {
  const paused = { ...task, status: "paused" };
  jest.mocked(taskItemApi).mockResolvedValue(paused);
  await emit("onDownloadPause");
  expect(fetchTasks).toHaveBeenCalledTimes(1);
  expect(syncToDownloadHistory).toHaveBeenCalledWith(paused);
  expect(Notice.success).not.toHaveBeenCalled();
  expect(sendNotification).not.toHaveBeenCalled();
});

it.each([true, false])(
  "refreshes and saves a stopped task with notifications %s",
  async (enableNotify) => {
    const stopped = { ...task, status: "removed" };
    useTaskStore.setState({ enableNotify });
    jest.mocked(taskItemApi).mockResolvedValue(stopped);
    await emit("onDownloadStop");
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(syncToDownloadHistory).toHaveBeenCalledWith(stopped);
    expect(Notice.success).toHaveBeenCalledTimes(enableNotify ? 1 : 0);
    expect(sendNotification).not.toHaveBeenCalled();
  },
);

it.each([true, false])(
  "handles HTTP completion with notifications %s",
  async (enableNotify) => {
    useTaskStore.setState({ enableNotify });
    await emit("onDownloadComplete");
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(syncToDownloadHistory).toHaveBeenCalledWith(task);
    expect(sendNotification).toHaveBeenCalledTimes(enableNotify ? 1 : 0);
    if (enableNotify) {
      expect(sendNotification).toHaveBeenCalledWith({
        title: "archive.zip",
        body: "Complete",
      });
    }
  },
);

it.each([
  ["sequential", true],
  ["sequential", false],
  ["concurrent", true],
  ["concurrent", false],
] as const)(
  "handles %s BT completion events with notifications %s",
  async (order, enableNotify) => {
    const finished = { ...torrent, status: "complete" };
    useTaskStore.setState({ enableNotify });
    jest
      .mocked(taskItemApi)
      .mockResolvedValueOnce(torrent)
      .mockResolvedValueOnce(finished);
    if (order === "sequential") {
      await emit("onBtDownloadComplete");
      expect(sendNotification).toHaveBeenCalledTimes(enableNotify ? 1 : 0);
      await emit("onDownloadComplete");
    } else {
      await Promise.all([
        emit("onBtDownloadComplete"),
        emit("onDownloadComplete"),
      ]);
    }
    expect(sendNotification).toHaveBeenCalledTimes(enableNotify ? 1 : 0);
    if (enableNotify) {
      expect(sendNotification).toHaveBeenCalledWith({
        title: "archive",
        body: "Complete",
      });
    }
    expect(syncToDownloadHistory).toHaveBeenCalledWith(torrent);
    expect(syncToDownloadHistory).toHaveBeenCalledWith(finished);
    expect(fetchTasks).toHaveBeenCalledTimes(2);
  },
);

it("does not send a completion notification when an existing seed finishes", async () => {
  jest
    .mocked(taskItemApi)
    .mockResolvedValue({ ...torrent, status: "complete" });
  await emit("onDownloadComplete");
  expect(sendNotification).not.toHaveBeenCalled();
  expect(syncToDownloadHistory).toHaveBeenCalled();
});

it.each(["onDownloadComplete", "onBtDownloadComplete"] as const)(
  "does not announce metadata or intermediate downloads for %s",
  async (event) => {
    const intermediates: DownloadTask[] = [
      { ...torrent, bittorrent: { announceList: [] } },
      { ...task, followedBy: ["child"] },
      { ...torrent, followedBy: ["child"] },
    ];
    for (const intermediate of intermediates) {
      jest.mocked(taskItemApi).mockResolvedValueOnce(intermediate);
      await emit(event);
      expect(syncToDownloadHistory).toHaveBeenCalledWith(intermediate);
    }
    expect(sendNotification).not.toHaveBeenCalled();
    expect(fetchTasks).toHaveBeenCalledTimes(intermediates.length);
  },
);

it.each(events)(
  "refreshes the list and safely logs a failed %s detail lookup",
  async (event) => {
    jest
      .mocked(taskItemApi)
      .mockRejectedValue(new Error("Authorization: secret"));
    await expect(emit(event)).resolves.toBeUndefined();
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(syncToDownloadHistory).not.toHaveBeenCalled();
    expect(appLog).toHaveBeenCalledWith(
      APP_LOG_LEVEL.Error,
      `[Motrix] aria2 event failed: ${event}, gid: task`,
    );
    expect(sendNotification).not.toHaveBeenCalled();
  },
);

it("still synchronizes task details when list refresh fails", async () => {
  fetchTasks.mockRejectedValue(new Error("RPC failed"));
  await expect(emit("onDownloadPause")).resolves.toBeUndefined();
  expect(syncToDownloadHistory).toHaveBeenCalledWith(task);
  expect(appLog).toHaveBeenCalled();
});

it("handles history and logging failures without rejecting the event callback", async () => {
  syncToDownloadHistory.mockRejectedValue(new Error("Database failed"));
  jest.mocked(appLog).mockRejectedValue(new Error("Logger unavailable"));
  await expect(emit("onDownloadPause")).resolves.toBeUndefined();
  expect(fetchTasks).toHaveBeenCalledTimes(1);
});
