import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { mockRPC } from "@tauri-motrix/aria2/mocks";

import { TASK_STATUS_ENUM } from "@/constant/task";
import { Aria2File, Aria2Task } from "@/services/aria2c_api";
import { useTaskStore } from "@/store/task";
import {
  checkTaskIsBT,
  ellipsis,
  getFileNameFromFile,
  getTaskName,
  getTaskProgressColor,
  getTaskUri,
  isMagnetTask,
  timeFormat,
  timeRemaining,
} from "@/utils/task";

describe("Task Store", () => {
  beforeAll(() => {
    mockRPC(() => "OK");
    mockIPC((cmd) => {
      if (cmd === "get_aria2_info") {
        return {
          port: 16801,
          server: "http://127.0.0.1:16801",
        };
      }
    });
  });

  afterAll(() => {
    clearMocks();
  });
  it("should ensure correct default value", () => {
    expect(useTaskStore.getState().fetchType).toBe(TASK_STATUS_ENUM.Active);
  });

  it("should enable to fetch list", async () => {
    await useTaskStore.getState().fetchTasks();
    expect(useTaskStore.getState().tasks).toEqual(["OK", "OK"]);
  });
});

describe("Task Util", () => {
  beforeAll(() => {
    mockIPC((cmd, payload) => {
      if (cmd === "plugin:path|resolve") {
        // simple mock
        return (payload as { paths: string[] }).paths.join("\\");
      }
    });
  });
  it("should enable to ellipsis", () => {
    const str = ellipsis("1234567890", 5);
    expect(str).toBe("12345...");
  });

  const mockFile: Aria2File = {
    completedLength: "0",
    index: "1",
    length: "0",
    path: "",
    selected: "true",
    uris: [
      {
        status: "waiting",
        uri: "https://ubuntu.01link.hk/ubuntu-releases/24.04.2/ubuntu-24.04.2-desktop-amd64.iso",
      },
    ],
  };

  const mockAria2Task: Aria2Task = {
    completedLength: "0",
    connections: "0",
    dir: "C:\\Users\\xxx\\Downloads",
    downloadSpeed: "0",
    files: [mockFile],
    gid: "570c0169646d5e98",
    numPieces: "6050",
    pieceLength: "1048576",
    status: "paused",
    totalLength: "6343219200",
    uploadLength: "0",
    uploadSpeed: "0",
  };

  it("should enable to getFileNameFromFile", () => {
    const fileName = getFileNameFromFile(mockFile);
    expect(fileName).toBe("ubuntu-24.04.2-desktop-amd64.iso");
  });

  it("should enable to getTaskName", () => {
    const taskName = getTaskName(mockAria2Task);
    expect(taskName).toBe("ubuntu-24.04.2-desktop-amd64.iso");
  });

  it("should call getTaskName is unknown", () => {
    const taskName = getTaskName(null, "Unknown");
    expect(taskName).toBe("Unknown");
  });

  it("should enable to timeRemaining", () => {
    const { totalLength, completedLength, downloadSpeed } = mockAria2Task;
    const remaining = timeRemaining(
      +totalLength,
      +completedLength,
      +downloadSpeed,
    );
    expect(remaining).toBe(Number.POSITIVE_INFINITY);
  });

  it("should enable to getTaskFullPath", async () => {
    const getTaskFullPath = await import("@/utils/task").then(
      (m) => m.getTaskFullPath,
    );
    const path = await getTaskFullPath(mockAria2Task);
    expect(path).toBe(
      "C:\\Users\\xxx\\Downloads\\ubuntu-24.04.2-desktop-amd64.iso",
    );
  });

  it("should enable to timeFormat", () => {
    const timeVo = timeFormat(0);
    expect(timeVo).toBe("");
  });

  it("should be false on isMagnetTask", () => {
    const result = isMagnetTask(mockAria2Task);
    expect(result).toBe(false);
  });

  it("should enable to getTaskUri", () => {
    const uri = getTaskUri(mockAria2Task);
    expect(uri).toBe(
      "https://ubuntu.01link.hk/ubuntu-releases/24.04.2/ubuntu-24.04.2-desktop-amd64.iso",
    );
  });

  it("should be false on checkTaskIsBT", () => {
    const result = checkTaskIsBT(mockAria2Task);
    expect(result).toBe(false);
  });

  it("should enable to getTaskProgressColor", () => {
    const color = getTaskProgressColor(50, TASK_STATUS_ENUM.Pause);
    expect(color).toBe("secondary");
  });
});
