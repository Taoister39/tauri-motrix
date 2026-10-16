import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { useNavigate } from "react-router";

import type { AddTaskDialogRef } from "@/business/task/AddTaskDialog";
import { Notice } from "@/components/Notice";
import { TASK_STATUS_ENUM } from "@/constant/task";
import { useTray } from "@/hooks/tray";
import { connectTray, readTorrentFile } from "@/services/tray";
import { checkForUpdates } from "@/services/updates";
import { useTaskStore } from "@/store/task";

jest.mock("react-router", () => ({ useNavigate: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/services/tray", () => ({
  connectTray: jest.fn(),
  readTorrentFile: jest.fn(),
}));
jest.mock("@/services/updates", () => ({ checkForUpdates: jest.fn() }));
jest.mock("@/services/dialog", () => ({ showDialog: jest.fn() }));
jest.mock("@/components/Notice", () => ({ Notice: { error: jest.fn() } }));
jest.mock("@/store/task", () => ({ useTaskStore: { getState: jest.fn() } }));
jest.mock("@/store/aria2_state", () => ({
  useAria2StateStore: { getState: jest.fn() },
}));

const navigate = jest.fn();
const setKeyword = jest.fn();
const setFetchType = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useNavigate).mockReturnValue(navigate);
  jest.mocked(connectTray).mockResolvedValue(jest.fn());
  jest
    .mocked(useTaskStore.getState)
    .mockReturnValue({ setKeyword, setFetchType } as unknown as ReturnType<
      typeof useTaskStore.getState
    >);
});

function setup() {
  const ref = createRef<AddTaskDialogRef>();
  ref.current = {
    open: jest.fn(),
    close: jest.fn(),
    openFromShortcut: jest.fn(),
  };
  const hook = renderHook(() => useTray(ref));
  const handlers = jest.mocked(connectTray).mock.calls[0][0];
  return { ref, handlers, ...hook };
}

it("opens the unfiltered active task list and settings from tray navigation", async () => {
  const { handlers } = setup();
  await act(async () => handlers.action({ action: "downloads" }));
  expect(setKeyword).toHaveBeenCalledWith("");
  expect(setFetchType).toHaveBeenCalledWith(TASK_STATUS_ENUM.Active);
  expect(navigate).toHaveBeenCalledWith("/task-start", {
    state: { resetSearch: expect.any(Number) },
  });
  await act(async () => handlers.action({ action: "settings" }));
  expect(navigate).toHaveBeenLastCalledWith("/settings");
});

it("imports the selected torrent into the confirmation panel", async () => {
  const file = new File(["data"], "test.torrent");
  jest.mocked(readTorrentFile).mockResolvedValue(file);
  const { ref, handlers } = setup();
  await act(async () =>
    handlers.action({ action: "open_torrent", path: "test.torrent" }),
  );
  expect(ref.current?.open).toHaveBeenCalledWith("torrent", file);
});

it("uses the dedicated shortcut entry without resetting the normal dialog", async () => {
  const { ref, handlers } = setup();
  await act(async () => handlers.action({ action: "add_task_from_shortcut" }));
  expect(ref.current?.openFromShortcut).toHaveBeenCalledTimes(1);
  expect(ref.current?.open).not.toHaveBeenCalled();
});

it("keeps the existing form when the selected torrent cannot be read", async () => {
  jest.mocked(readTorrentFile).mockRejectedValue(new Error("Unreadable file"));
  const { ref, handlers } = setup();
  await act(async () =>
    handlers.action({ action: "open_torrent", path: "test.torrent" }),
  );
  expect(ref.current?.open).not.toHaveBeenCalled();
  expect(Notice.error).toHaveBeenCalledWith("tray.TorrentReadFailed");
});

it("reuses the manual update check", async () => {
  const { handlers } = setup();
  await act(async () => handlers.action({ action: "check_update" }));
  expect(checkForUpdates).toHaveBeenCalledTimes(1);
});

it("keeps the same connection across navigation and translation changes", () => {
  const { rerender } = setup();
  jest.mocked(useNavigate).mockReturnValue(jest.fn());
  rerender();
  expect(connectTray).toHaveBeenCalledTimes(1);
});
