import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { readFileAsBase64 } from "@/services/cmd";
import { connectTray, readTorrentFile, type TrayAction } from "@/services/tray";

jest.mock("@tauri-apps/api/core", () => ({ invoke: jest.fn() }));
jest.mock("@tauri-apps/api/event", () => ({ listen: jest.fn() }));
jest.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: jest.fn() }));
jest.mock("@/services/cmd", () => ({ readFileAsBase64: jest.fn() }));

const events = new Map<string, () => void>();
let focus: (event: { payload: boolean }) => void;
const visible = jest.fn();
const minimized = jest.fn();
const unlisten = jest.fn();
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  events.clear();
  visible.mockResolvedValue(true);
  minimized.mockResolvedValue(false);
  jest.mocked(getCurrentWindow).mockReturnValue({
    isVisible: visible,
    isMinimized: minimized,
    onFocusChanged: jest.fn(async (callback) => {
      focus = callback;
      return unlisten;
    }),
  } as unknown as ReturnType<typeof getCurrentWindow>);
  jest.mocked(listen).mockImplementation(async (name, callback) => {
    events.set(name, () => callback({ event: name, id: 1, payload: null }));
    return unlisten;
  });
  jest.mocked(invoke).mockResolvedValue([]);
});

function handlers() {
  return {
    action: jest.fn(),
    reports: jest.fn(),
    changed: jest.fn(),
    error: jest.fn(),
  };
}

it("consumes startup actions after installing listeners and serializes later requests", async () => {
  const callbacks = handlers();
  const queued: TrayAction[] = [{ action: "settings" }, { action: "add_task" }];
  jest.mocked(invoke).mockImplementation(async (name) => {
    expect(events.size).toBe(3);
    return (name === "take_tray_actions" ? queued.splice(0) : []) as never;
  });
  const stop = await connectTray(callbacks, new AbortController().signal);
  await flush();
  expect(callbacks.action.mock.calls.map(([action]) => action.action)).toEqual([
    "settings",
    "add_task",
  ]);
  events.get("motrix://tray-actions")?.();
  events.get("motrix://tray-actions")?.();
  await flush();
  expect(callbacks.action).toHaveBeenCalledTimes(2);
  stop();
  expect(unlisten).toHaveBeenCalledTimes(4);
});

it("keeps hidden-window failure reports until the next visible focus", async () => {
  const callbacks = handlers();
  const report = {
    action: "pause",
    succeeded: 1,
    failures: [{ engine: "vortex", id: "id", reason: "control_failed" }],
  };
  visible.mockResolvedValue(false);
  jest
    .mocked(invoke)
    .mockImplementation(
      async (name) => (name === "take_tray_reports" ? [report] : []) as never,
    );
  const stop = await connectTray(callbacks, new AbortController().signal);
  await flush();
  expect(invoke).not.toHaveBeenCalledWith("take_tray_reports");
  visible.mockResolvedValue(true);
  focus({ payload: true });
  await flush();
  expect(callbacks.reports).toHaveBeenCalledWith([report]);
  stop();
});

it("cleans up listeners when disconnected during registration", async () => {
  const callbacks = handlers();
  const controller = new AbortController();
  const connection = connectTray(callbacks, controller.signal);
  controller.abort();
  await connection;
  await flush();
  expect(unlisten).toHaveBeenCalledTimes(4);
  expect(invoke).not.toHaveBeenCalled();
});

it("continues handling actions after one action fails", async () => {
  const callbacks = handlers();
  callbacks.action.mockRejectedValueOnce(new Error("Read failed"));
  jest
    .mocked(invoke)
    .mockResolvedValueOnce([
      { action: "open_torrent", path: "bad.torrent" },
      { action: "settings" },
    ]);
  const stop = await connectTray(callbacks, new AbortController().signal);
  await flush();
  expect(callbacks.action).toHaveBeenCalledTimes(2);
  expect(callbacks.error).toHaveBeenCalledTimes(1);
  stop();
});

it("converts the selected native torrent into the existing file import type", async () => {
  jest.mocked(readFileAsBase64).mockResolvedValue(btoa("torrent-data"));
  const file = await readTorrentFile("C:\\Downloads\\example.torrent");
  expect(file.name).toBe("example.torrent");
  expect(file.size).toBe(12);
  expect(file.type).toBe("application/x-bittorrent");
});

it("propagates a native torrent read failure without creating a file", async () => {
  jest.mocked(readFileAsBase64).mockRejectedValue(new Error("Missing file"));
  await expect(readTorrentFile("missing.torrent")).rejects.toThrow(
    "Missing file",
  );
});
