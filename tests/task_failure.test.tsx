import "@/services/i18n";

import { invoke } from "@tauri-apps/api/core";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { fireEvent, render, screen } from "@testing-library/react";

import TaskItemAction from "@/business/task/TaskItemAction";
import { Notice } from "@/components/Notice";
import { TASK_STATUS_ENUM } from "@/constant/task";
import * as aria2 from "@/services/aria2c_api";
import * as download from "@/services/download";
import { useTaskStore } from "@/store/task";
import { getTaskProgressColor } from "@/utils/task";

jest.mock("@/services/aria2c_api", () => ({
  getAria2: jest.fn(),
  taskItemApi: jest.fn(),
  getOptionApi: jest.fn(),
  removeDownloadResultTaskApi: jest.fn(),
  saveSessionApi: jest.fn(),
  stoppedTasksApi: jest.fn(),
  resumeTaskApi: jest.fn(),
}));
jest.mock("@tauri-apps/api/core", () => ({
  ...jest.requireActual("@tauri-apps/api/core"),
  invoke: jest.fn(),
}));
jest.mock("@tauri-apps/plugin-notification", () => ({
  sendNotification: jest.fn(),
}));
jest.mock("@/services/cmd", () => ({ appLog: jest.fn() }));
jest.mock("@/services/download", () => ({
  ...jest.requireActual("@/services/download"),
  registerVortexEvents: jest.fn(),
}));
jest.mock("@/components/Notice", () => ({
  Notice: { error: jest.fn() },
}));

const failedTask: download.DownloadTask = {
  gid: "failed",
  status: "error",
  dir: "C:/Downloads",
  files: [
    {
      index: "1",
      path: "C:/Downloads/custom.zip",
      length: "100",
      completedLength: "50",
      selected: "true",
      uris: [
        { uri: "https://example.com/file.zip", status: "used" },
        { uri: "https://mirror.example.com/file.zip", status: "waiting" },
      ],
    },
  ],
  errorCode: "3",
  errorMessage: "Resource not found",
  completedLength: "50",
  totalLength: "100",
  connections: "0",
  downloadSpeed: "0",
  uploadSpeed: "0",
  uploadLength: "0",
  numPieces: "1",
  pieceLength: "100",
};
const initialState = useTaskStore.getState();
const call = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useTaskStore.setState(initialState, true);
  jest
    .mocked(aria2.getAria2)
    .mockResolvedValue({ call, addListener: jest.fn() } as unknown as Awaited<
      ReturnType<typeof aria2.getAria2>
    >);
  jest.mocked(aria2.taskItemApi).mockResolvedValue(failedTask);
  jest.mocked(aria2.getOptionApi).mockResolvedValue({
    gid: "failed",
    out: "custom.zip",
    header: "Authorization: token",
    referer: "https://example.com",
    split: "4",
    pause: "true",
  });
  call.mockReset().mockResolvedValue("replacement");
});
afterEach(() => {
  jest.restoreAllMocks();
  useTaskStore.setState(initialState, true);
});

describe("Retry failed downloads", () => {
  it("recreates an aria2 task with its mirrors, options and partial file", async () => {
    await expect(download.retryTaskApi("failed")).resolves.toBe("replacement");
    expect(call).toHaveBeenCalledWith(
      "addUri",
      failedTask.files[0].uris.map(({ uri }) => uri),
      {
        dir: "C:/Downloads",
        out: "custom.zip",
        header: "Authorization: token",
        referer: "https://example.com",
        split: "4",
        pause: "false",
        continue: "true",
        "auto-file-renaming": "false",
      },
    );
    expect(aria2.removeDownloadResultTaskApi).toHaveBeenCalledWith("failed");
    expect(aria2.saveSessionApi).toHaveBeenCalled();
  });

  it("retries a torrent through its magnet link and trackers", async () => {
    jest.mocked(aria2.taskItemApi).mockResolvedValue({
      ...failedTask,
      infoHash: "abc123",
      bittorrent: {
        info: { name: "archive" },
        announceList: [["https://tracker.example.com"]],
      },
      files: [{ ...failedTask.files[0], uris: [] }],
    });
    await download.retryTaskApi("failed");
    expect(call).toHaveBeenCalledWith(
      "addUri",
      ["magnet:?xt=urn:btih:abc123&dn=archive&tr=https://tracker.example.com"],
      expect.any(Object),
    );
  });

  it("keeps the failed result when the replacement cannot be added", async () => {
    call.mockRejectedValue(new Error("RPC failed"));
    await expect(download.retryTaskApi("failed")).rejects.toThrow("RPC failed");
    expect(aria2.removeDownloadResultTaskApi).not.toHaveBeenCalled();
  });

  it("uses the native retry command for Vortex", async () => {
    await download.retryTaskApi("vortex:failed");
    expect(invoke).toHaveBeenCalledWith("vortex_control", {
      id: "failed",
      action: "retry",
    });
    expect(call).not.toHaveBeenCalled();
  });

  it("refreshes the failed list and clears selection after retry", async () => {
    const fetchTasks = jest.fn();
    useTaskStore.setState({
      tasks: [failedTask],
      selectedTaskIds: ["failed"],
      fetchTasks,
    });
    await useTaskStore.getState().handleTaskResume("failed");
    expect(call).toHaveBeenCalledWith(
      "addUri",
      expect.any(Array),
      expect.any(Object),
    );
    expect(useTaskStore.getState().selectedTaskIds).toEqual([]);
    expect(fetchTasks).toHaveBeenCalled();
  });

  it.each(["failed", "vortex:failed"])(
    "offers a retry button for %s",
    (gid) => {
      const onResume = jest.fn();
      render(
        <TaskItemAction
          gid={gid}
          status="error"
          onResume={onResume}
          onPause={jest.fn()}
          onStop={jest.fn()}
          onCopyLink={jest.fn()}
          onOpenFile={jest.fn()}
        />,
      );
      fireEvent.click(screen.getByTitle("Retry"));
      expect(onResume).toHaveBeenCalledWith(gid);
    },
  );
});

describe("Failed task presentation", () => {
  it.each([
    [TASK_STATUS_ENUM.Done, "complete"],
    [TASK_STATUS_ENUM.Error, "error"],
  ])("separates the %s list", async (fetchType, status) => {
    jest
      .mocked(aria2.stoppedTasksApi)
      .mockResolvedValue([
        failedTask,
        { ...failedTask, gid: "done", status: "complete" },
      ]);
    jest.mocked(invoke).mockResolvedValue([]);
    useTaskStore.setState({ fetchType });
    await useTaskStore.getState().fetchTasks();
    expect(useTaskStore.getState().tasks.map((task) => task.status)).toEqual([
      status,
    ]);
  });

  it("shows failure color even if all bytes have downloaded", () => {
    expect(getTaskProgressColor(100, "error")).toBe("error");
  });
});

describe("Download failure notifications", () => {
  it.each([true, false])(
    "respects the system notification preference (%s) for aria2",
    async (enableNotify) => {
      const syncToDownloadHistory = jest.fn();
      const fetchTasks = jest.fn();
      useTaskStore.setState({
        enableNotify,
        syncToDownloadHistory,
        fetchTasks,
      });
      await useTaskStore.getState().onDownloadError([{ gid: "failed" }]);
      expect(Notice.error).toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalledTimes(enableNotify ? 1 : 0);
      if (enableNotify)
        expect(sendNotification).toHaveBeenCalledWith({
          title: "custom.zip",
          body: "Error occurred when downloading custom.zip",
        });
      expect(syncToDownloadHistory).toHaveBeenCalledWith(
        expect.objectContaining(failedTask),
      );
      expect(fetchTasks).toHaveBeenCalled();
    },
  );

  it.each([
    [true, false, 1],
    [false, false, 0],
    [true, true, 0],
  ])(
    "handles Vortex notification preference %s and initial sync %s",
    async (enableNotify, initial, count) => {
      const register = jest
        .mocked(download.registerVortexEvents)
        .mockResolvedValue();
      useTaskStore.setState({
        enableNotify,
        syncToDownloadHistory: jest.fn(),
        fetchTasks: jest.fn(),
      });
      await useTaskStore.getState().registerEvent();
      const update = register.mock.calls[0][0];
      await update(
        { ...failedTask, gid: "vortex:failed" },
        { ...failedTask, status: "active" },
        initial,
      );
      expect(sendNotification).toHaveBeenCalledTimes(count);
    },
  );
});
