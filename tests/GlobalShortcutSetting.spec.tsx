import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { SWRConfig } from "swr";

import GlobalShortcutSetting from "@/business/setting/GlobalShortcutSetting";
import { getMotrixConfig, patchMotrixConfig } from "@/services/cmd";
import {
  getGlobalShortcutStatus,
  setGlobalShortcutRecording,
} from "@/services/shortcuts";

jest.mock("@/services/cmd", () => ({
  getMotrixConfig: jest.fn(),
  patchMotrixConfig: jest.fn(),
}));
jest.mock("@/services/shortcuts", () => ({
  ...jest.requireActual("@/services/shortcuts"),
  getGlobalShortcutStatus: jest.fn(),
  setGlobalShortcutRecording: jest.fn(),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { action: string }) =>
      values ? `${key} ${values.action}` : key,
  }),
}));

const patchMotrix = jest.mocked(patchMotrixConfig);
let config: MotrixConfig;
const activeStatus = {
  available: true,
  show_window: { active: false, error: null },
  new_download: { active: false, error: null },
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getGlobalShortcutStatus).mockResolvedValue(activeStatus);
  jest.mocked(setGlobalShortcutRecording).mockResolvedValue();
  config = { global_shortcut_show_window: "control+KeyM" } as MotrixConfig;
  jest.mocked(getMotrixConfig).mockImplementation(async () => ({ ...config }));
  patchMotrix.mockImplementation(async (patch) => {
    config = { ...config, ...patch };
  });
});

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

async function setup() {
  const view = render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <GlobalShortcutSetting />
    </SWRConfig>,
  );
  const edit = await screen.findByRole("button", {
    name: "shortcuts.EditAction shortcuts.ShowWindow",
  });
  await waitFor(() => expect(edit).toBeEnabled());
  return { edit, ...view };
}

async function record(edit: HTMLElement) {
  fireEvent.click(edit);
  const input = await screen.findByRole("textbox", {
    name: "shortcuts.Combination",
  });
  await waitFor(() => expect(input).toBeEnabled());
  expect(setGlobalShortcutRecording).toHaveBeenCalledWith(true);
  fireEvent.keyDown(input, {
    key: "n",
    code: "KeyN",
    ctrlKey: true,
    altKey: true,
  });
  expect(input).toHaveValue("Ctrl + Alt + N");
  return input;
}

it("captures a combination, confirms it, and restores native actions", async () => {
  const { edit } = await setup();
  await record(edit);
  fireEvent.click(screen.getByRole("button", { name: "common.Ok" }));
  await waitFor(() =>
    expect(patchMotrix).toHaveBeenCalledWith({
      global_shortcut_show_window: "control+alt+KeyN",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(setGlobalShortcutRecording).toHaveBeenLastCalledWith(false);
});

it("cancels with Escape without changing the stored binding", async () => {
  const { edit } = await setup();
  const input = await record(edit);
  fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(patchMotrix).not.toHaveBeenCalled();
  expect(setGlobalShortcutRecording).toHaveBeenLastCalledWith(false);
  expect(edit).toHaveTextContent("Ctrl + M");
});

it("shows registration conflicts and retains the previous binding", async () => {
  patchMotrix.mockRejectedValue("registration_failed");
  const { edit } = await setup();
  await record(edit);
  fireEvent.click(screen.getByRole("button", { name: "common.Ok" }));
  expect(
    await screen.findByText("shortcuts.Errors.registration_failed"),
  ).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(edit).toHaveTextContent("Ctrl + M");
  fireEvent.click(screen.getByRole("button", { name: "common.Cancel" }));
  await waitFor(() =>
    expect(setGlobalShortcutRecording).toHaveBeenLastCalledWith(false),
  );
});

it("clears a binding using an explicit empty string", async () => {
  await setup();
  fireEvent.click(
    screen.getByRole("button", {
      name: "shortcuts.ClearAction shortcuts.ShowWindow",
    }),
  );
  await waitFor(() =>
    expect(patchMotrix).toHaveBeenCalledWith({
      global_shortcut_show_window: "",
    }),
  );
});

it.each(["blur", "unmount"])(
  "restores native actions after %s",
  async (action) => {
    const { edit, unmount } = await setup();
    await record(edit);
    if (action === "unmount") unmount();
    else fireEvent(window, new Event("blur"));
    await waitFor(() =>
      expect(setGlobalShortcutRecording).toHaveBeenLastCalledWith(false),
    );
    expect(patchMotrix).not.toHaveBeenCalled();
  },
);

it("does not reopen a recorder after an interrupted start", async () => {
  let finish!: () => void;
  jest.mocked(setGlobalShortcutRecording).mockImplementation((recording) =>
    recording
      ? new Promise<void>((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(),
  );
  const { edit } = await setup();
  fireEvent.click(edit);
  await waitFor(() =>
    expect(setGlobalShortcutRecording).toHaveBeenCalledWith(true),
  );
  fireEvent(window, new Event("blur"));
  await act(async () => finish());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("shows an unavailable platform and disables recording", async () => {
  jest
    .mocked(getGlobalShortcutStatus)
    .mockResolvedValue({ ...activeStatus, available: false });
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <GlobalShortcutSetting />
    </SWRConfig>,
  );
  expect(
    await screen.findByText("shortcuts.Errors.unavailable"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", {
      name: "shortcuts.EditAction shortcuts.ShowWindow",
    }),
  ).toBeDisabled();
});

it("keeps unsupported keys out of the candidate and leaves confirmation unavailable", async () => {
  const { edit } = await setup();
  fireEvent.click(edit);
  const input = await screen.findByRole("textbox", {
    name: "shortcuts.Combination",
  });
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.keyDown(input, {
    key: "Control",
    code: "ControlLeft",
    ctrlKey: true,
  });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter", ctrlKey: true });
  expect(input).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "common.Ok" }),
  ).not.toBeInTheDocument();
  expect(patchMotrix).not.toHaveBeenCalled();
});

it("opens the starting phase immediately and safely cancels a pending native start", async () => {
  let started!: () => void;
  jest.mocked(setGlobalShortcutRecording).mockImplementation((recording) =>
    recording
      ? new Promise<void>((resolve) => {
          started = resolve;
        })
      : Promise.resolve(),
  );
  const { edit } = await setup();
  fireEvent.click(edit);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("shortcuts.starting")).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeDisabled();
  await waitFor(() =>
    expect(setGlobalShortcutRecording).toHaveBeenCalledWith(true),
  );
  fireEvent.click(screen.getByRole("button", { name: "common.Cancel" }));
  expect(screen.getByText("shortcuts.stopping")).toBeInTheDocument();
  await act(async () => started());
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    jest
      .mocked(setGlobalShortcutRecording)
      .mock.calls.map(([enabled]) => enabled),
  ).toEqual([true, false]);
});

it("keeps the dialog open until native actions have been restored", async () => {
  const { edit } = await setup();
  await record(edit);
  let restored!: () => void;
  jest.mocked(setGlobalShortcutRecording).mockImplementation((recording) =>
    recording
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          restored = resolve;
        }),
  );
  fireEvent.click(screen.getByRole("button", { name: "common.Cancel" }));
  await waitFor(() =>
    expect(setGlobalShortcutRecording).toHaveBeenLastCalledWith(false),
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("shortcuts.stopping")).toBeInTheDocument();
  await act(async () => restored());
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("offers recovery if restoring native actions fails", async () => {
  const { edit } = await setup();
  await record(edit);
  jest
    .mocked(setGlobalShortcutRecording)
    .mockRejectedValueOnce("IPC unavailable");
  fireEvent.click(screen.getByRole("button", { name: "common.Cancel" }));
  expect(
    await screen.findByText("shortcuts.Errors.recording_failed"),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "shortcuts.RetryRestore" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(patchMotrix).not.toHaveBeenCalled();
});

it("waits for both configuration and runtime status before completing a save", async () => {
  const { edit } = await setup();
  await record(edit);
  let resolveConfig!: (value: MotrixConfig) => void;
  let resolveStatus!: (value: typeof activeStatus) => void;
  jest.mocked(getMotrixConfig).mockReturnValueOnce(
    new Promise<MotrixConfig>((resolve) => {
      resolveConfig = resolve;
    }),
  );
  jest.mocked(getGlobalShortcutStatus).mockReturnValueOnce(
    new Promise<typeof activeStatus>((resolve) => {
      resolveStatus = resolve;
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "common.Ok" }));
  await waitFor(() => expect(patchMotrix).toHaveBeenCalledTimes(1));
  await act(async () =>
    resolveConfig({
      ...config,
      global_shortcut_show_window: "control+alt+KeyN",
    }),
  );
  expect(screen.getByText("shortcuts.saving")).toBeInTheDocument();
  expect(edit).toHaveTextContent("Ctrl + M");
  await act(async () =>
    resolveStatus({
      ...activeStatus,
      show_window: { active: true, error: null },
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(edit).toHaveTextContent("Ctrl + Alt + N");
  expect(screen.getByText("shortcuts.Active")).toBeInTheDocument();
});

it("reports refresh failure separately from a completed save and supports retry", async () => {
  const { edit } = await setup();
  await record(edit);
  jest
    .mocked(getGlobalShortcutStatus)
    .mockRejectedValueOnce(new Error("IPC unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "common.Ok" }));
  expect(await screen.findByText("shortcuts.StatusFailed")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(patchMotrix).toHaveBeenCalledTimes(1);
  expect(edit).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "shortcuts.Retry" }));
  await waitFor(() => expect(edit).toBeEnabled());
  expect(edit).toHaveTextContent("Ctrl + Alt + N");
  expect(patchMotrix).toHaveBeenCalledTimes(1);
});
