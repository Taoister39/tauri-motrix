import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { DOWNLOAD_ENGINE } from "@/constant/task";
import * as aria2 from "@/services/aria2c_api";
import { getAria2Config, getMotrixConfig } from "@/services/cmd";
import {
  addTaskApi,
  batchPauseTaskApi,
  fromVortex,
  getGlobalStatApi,
  registerVortexEvents,
  stoppedTasksApi,
  taskRef,
  type VortexSnapshot,
} from "@/services/download";

jest.mock("@tauri-apps/api/core", () => ({ invoke: jest.fn() }));
jest.mock("@tauri-apps/api/event", () => ({ listen: jest.fn() }));
jest.mock("@/services/aria2c_api");
jest.mock("@/services/cmd");

const snapshot: VortexSnapshot = {
  id: "same",
  revision: 2,
  state: "complete",
  url: "https://example.test/file",
  path: "C:\\Downloads\\file",
  total: 9,
  completed: 9,
  speed: 0,
  connections: 0,
  error: null,
};
beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(getMotrixConfig)
    .mockResolvedValue({ http_engine: "vortex" } as MotrixConfig);
  jest
    .mocked(getAria2Config)
    .mockResolvedValue({ dir: "Downloads" } as Aria2Config);
  jest
    .mocked(invoke)
    .mockImplementation(async (command) =>
      command === "vortex_list" ? [snapshot] : "new-id",
    );
});
it("routes only new HTTP tasks through the selected engine", async () => {
  expect(await addTaskApi(snapshot.url, {})).toBe("vortex:new-id");
  expect(invoke).toHaveBeenCalledWith("vortex_add", {
    request: {
      url: snapshot.url,
      directory: "Downloads",
      filename: null,
      headers: {},
      referer: null,
    },
  });
  await addTaskApi("magnet:?xt=urn:btih:abc", {});
  expect(aria2.addTaskApi).toHaveBeenCalledWith("magnet:?xt=urn:btih:abc", {});
  jest
    .mocked(getMotrixConfig)
    .mockResolvedValue({ http_engine: "aria2c" } as MotrixConfig);
  await addTaskApi(snapshot.url, {});
  expect(aria2.addTaskApi).toHaveBeenCalledWith(snapshot.url, {});
});
it("rejects unsupported options instead of silently discarding them", async () => {
  await expect(addTaskApi(snapshot.url, { split: 128 })).rejects.toThrow(
    "Unsupported Vortex options",
  );
  expect(invoke).not.toHaveBeenCalled();
});
it("sends a custom User-Agent as one Vortex header, overriding a case-insensitive header", async () => {
  await addTaskApi(snapshot.url, {
    "user-agent": " Custom/1.0 ",
    header: ["user-agent: Old/1.0", "Accept: */*"],
  });
  expect(invoke).toHaveBeenCalledWith("vortex_add", {
    request: expect.objectContaining({
      headers: { "User-Agent": "Custom/1.0", Accept: "*/*" },
    }),
  });
});

it("passes User-Agent through to aria2 for URL downloads", async () => {
  jest
    .mocked(getMotrixConfig)
    .mockResolvedValue({ http_engine: "aria2c" } as MotrixConfig);
  await addTaskApi(snapshot.url, { "user-agent": "Custom/1.0" });
  expect(aria2.addTaskApi).toHaveBeenCalledWith(snapshot.url, {
    "user-agent": "Custom/1.0",
  });
});
it("keeps engine identity when native task IDs coincide", async () => {
  jest
    .mocked(aria2.stoppedTasksApi)
    .mockResolvedValue([
      { gid: "same", status: "complete" } as aria2.Aria2Task,
    ]);
  const tasks = await stoppedTasksApi();
  expect(tasks.map((t) => t.ref)).toEqual([
    { engine: DOWNLOAD_ENGINE.Aria2, id: "same" },
    { engine: DOWNLOAD_ENGINE.Vortex, id: "same" },
  ]);
  expect(taskRef(tasks[1].gid)).toEqual({
    engine: DOWNLOAD_ENGINE.Vortex,
    id: "same",
  });
  expect(fromVortex(snapshot).files[0].path).toBe("C:/Downloads/file");
});
it("dispatches mixed batch operations and reports partial failure", async () => {
  jest
    .mocked(aria2.pauseTaskApi)
    .mockRejectedValue(new Error("RPC unavailable"));
  await expect(batchPauseTaskApi(["same", "vortex:same"])).rejects.toThrow(
    "1 download operation(s) failed",
  );
  expect(invoke).toHaveBeenCalledWith("vortex_control", {
    id: "same",
    action: "pause",
  });
  expect(aria2.pauseTaskApi).toHaveBeenCalledWith("same");
});
it("continues displaying Vortex statistics if aria2 is unavailable", async () => {
  jest.mocked(aria2.getGlobalStatApi).mockRejectedValue(new Error("offline"));
  expect(await getGlobalStatApi()).toEqual({
    downloadSpeed: "0",
    uploadSpeed: "0",
    numActive: "0",
    numWaiting: "0",
    numStopped: "1",
  });
});

it("reconciles startup history and delivers a completion transition only once", async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(listen).mockResolvedValue(jest.fn());
    jest
      .mocked(invoke)
      .mockResolvedValue([{ ...snapshot, state: "downloading" }]);
    const update = jest.fn().mockResolvedValue(undefined);
    await registerVortexEvents(update);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
      undefined,
      true,
    );
    const handler = jest
      .mocked(listen)
      .mock.calls.find(([event]) => event === "vortex-task")![1];
    for (const revision of [3, 3, 2])
      handler({
        event: "vortex-task",
        id: 1,
        payload: { task: { ...snapshot, revision } },
      });
    await jest.advanceTimersByTimeAsync(0);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "complete" }),
      expect.objectContaining({ status: "active" }),
      false,
    );
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});
