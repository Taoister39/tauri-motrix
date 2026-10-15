import {
  decodeTorrentFile,
  type ParsedTorrentFile,
} from "@tauri-motrix/torrent";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { useNavigate } from "react-router";

import AddTaskDialog, { AddTaskDialogRef } from "@/business/task/AddTaskDialog";
import { Notice } from "@/components/Notice";
import { DOWNLOAD_ENGINE } from "@/constant/task";
import { useAria2 } from "@/hooks/aria2";
import { useMotrix } from "@/hooks/motrix";
import { addTaskApi, addTorrentApi } from "@/services/download";
import { addOneDir } from "@/services/save_to_history";
import { useTaskStore } from "@/store/task";
import { TaskSource } from "@/utils/task_options";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("react-router", () => ({ useNavigate: jest.fn() }));
jest.mock("@tauri-motrix/torrent", () => ({ decodeTorrentFile: jest.fn() }));
jest.mock("swr", () => ({ mutate: jest.fn() }));
jest.mock("@/hooks/aria2");
jest.mock("@/hooks/motrix");
jest.mock("@/services/download");
jest.mock("@/services/save_to_history");
jest.mock("@/store/task", () => ({ useTaskStore: jest.fn() }));
jest.mock("@/components/Notice", () => ({ Notice: { error: jest.fn() } }));
jest.mock("@/business/history/HistoryPathInput", () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: () => void }) => (
    <input aria-label="common.DownloadPath" value={value} onChange={onChange} />
  ),
}));

const fetchTasks = jest.fn();
const navigate = jest.fn();
const torrent = {
  files: [
    { name: "one.txt", path: "one.txt", length: 1, offset: 0 },
    { name: "two.txt", path: "two.txt", length: 2, offset: 1 },
  ],
};
const parseTorrent = jest.mocked(decodeTorrentFile);
const parsedTorrent = (version: "v1" | "v2" | "hybrid" = "v1") =>
  ({ ...torrent, version }) as ParsedTorrentFile;

function deferredParse() {
  let resolve!: (torrent: ParsedTorrentFile) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<ParsedTorrentFile>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function openDialog(source: TaskSource = "url") {
  const ref = createRef<AddTaskDialogRef>();
  render(<AddTaskDialog ref={ref} />);
  act(() => ref.current?.open(source));
  return ref;
}

async function upload(name = "test.torrent") {
  await act(async () => {
    fireEvent.change(
      screen.getByRole("dialog").querySelector('input[type="file"]')!,
      {
        target: { files: [new File(["torrent"], name)] },
      },
    );
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useNavigate).mockReturnValue(navigate);
  jest
    .mocked(useAria2)
    .mockReturnValue({ aria2: { dir: "Downloads" } } as ReturnType<
      typeof useAria2
    >);
  jest.mocked(useMotrix).mockReturnValue({
    motrix: { http_engine: "aria2c", new_task_show_downloading: true },
  } as ReturnType<typeof useMotrix>);
  jest.mocked(useTaskStore).mockReturnValue(fetchTasks);
  parseTorrent.mockResolvedValue(parsedTorrent());
});

it.each(["aria2c", "vortex"] as const)(
  "submits URL and shared User-Agent options using %s",
  async (http_engine) => {
    jest.mocked(useMotrix).mockReturnValue({
      motrix: { http_engine, new_task_show_downloading: true },
    } as ReturnType<typeof useMotrix>);
    openDialog();
    fireEvent.change(screen.getByLabelText("common.DownloadLink"), {
      target: { value: " https://example.test/file " },
    });
    fireEvent.change(screen.getByLabelText("task.UserAgent"), {
      target: { value: " Custom/1.0 " },
    });
    if (http_engine === "vortex")
      expect(screen.queryByLabelText("task.Splits")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("common.Submit"));
    await waitFor(() =>
      expect(addTaskApi).toHaveBeenCalledWith("https://example.test/file", {
        dir: "Downloads",
        out: "",
        "user-agent": "Custom/1.0",
        ...(http_engine === "aria2c" ? { split: 128 } : {}),
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(fetchTasks).toHaveBeenCalled();
    expect(addOneDir).toHaveBeenCalledWith({
      dir: "Downloads",
      engine:
        http_engine === "vortex"
          ? DOWNLOAD_ENGINE.Vortex
          : DOWNLOAD_ENGINE.Aria2,
    });
    expect(navigate).toHaveBeenCalledWith("/task-start");
  },
);

it("switches from an invalid URL form to torrent import and submits the selected files", async () => {
  openDialog();
  fireEvent.click(screen.getByText("common.Submit"));
  await waitFor(() =>
    expect(screen.getByLabelText("common.DownloadLink")).toHaveAttribute(
      "aria-invalid",
      "true",
    ),
  );
  fireEvent.click(screen.getByRole("tab", { name: "common.FromTorrentFile" }));
  await upload();
  await screen.findByText("one.txt");
  fireEvent.click(screen.getAllByRole("checkbox")[2]);
  fireEvent.change(screen.getByLabelText("task.UserAgent"), {
    target: { value: "Torrent/1.0" },
  });
  fireEvent.click(screen.getByText("common.Submit"));
  await waitFor(() =>
    expect(addTorrentApi).toHaveBeenCalledWith("dG9ycmVudA==", {
      dir: "Downloads",
      out: "",
      split: 128,
      "user-agent": "Torrent/1.0",
      "select-file": "1",
    }),
  );
  expect(addTaskApi).not.toHaveBeenCalled();
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/task-start"));
  expect(addOneDir).toHaveBeenCalledWith({
    dir: "Downloads",
    engine: DOWNLOAD_ENGINE.Aria2,
  });
});

it("requires at least one torrent file to be selected", async () => {
  openDialog("torrent");
  await upload();
  await screen.findByText("one.txt");
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  fireEvent.click(screen.getByText("common.Submit"));
  expect(await screen.findByText("task.SelectFilesError")).toBeInTheDocument();
  expect(addTorrentApi).not.toHaveBeenCalled();
});

it("reports invalid torrents and ignores an older parse result after replacement", async () => {
  const old = deferredParse();
  const invalid = deferredParse();
  parseTorrent
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(invalid.promise);
  openDialog("torrent");
  await upload("old.torrent");
  await upload("invalid.torrent");
  await act(async () => invalid.reject(new Error("invalid")));
  await act(async () => old.resolve(parsedTorrent()));
  expect(screen.getByText("task.InvalidTorrent")).toBeInTheDocument();
  expect(screen.queryByText("one.txt")).not.toBeInTheDocument();
  expect(screen.queryByText("common.Submit")).not.toBeInTheDocument();
});

it("previews pure v2 files, blocks form submission and permits a hybrid replacement", async () => {
  parseTorrent.mockResolvedValueOnce(parsedTorrent("v2"));
  openDialog("torrent");
  await upload("v2.torrent");
  expect(await screen.findByText("one.txt")).toBeInTheDocument();
  expect(screen.getByText("task.UnsupportedTorrentV2")).toBeInTheDocument();
  expect(screen.queryByText("common.Submit")).not.toBeInTheDocument();
  await act(async () => fireEvent.submit(screen.getByRole("dialog")));
  expect(addTorrentApi).not.toHaveBeenCalled();
  parseTorrent.mockResolvedValueOnce(parsedTorrent("hybrid"));
  await upload("hybrid.torrent");
  expect(
    screen.queryByText("task.UnsupportedTorrentV2"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("common.Submit"));
  await waitFor(() =>
    expect(addTorrentApi).toHaveBeenCalledWith(
      "dG9ycmVudA==",
      expect.objectContaining({ "select-file": "1,2" }),
    ),
  );
});

it("blocks submission while parsing and ignores an old rejection after replacement", async () => {
  const pending = deferredParse();
  parseTorrent.mockReturnValueOnce(pending.promise);
  openDialog("torrent");
  await upload();
  expect(screen.queryByText("common.Submit")).not.toBeInTheDocument();
  await act(async () => fireEvent.submit(screen.getByRole("dialog")));
  expect(addTorrentApi).not.toHaveBeenCalled();
  await upload("replacement.torrent");
  expect(await screen.findByText("one.txt")).toBeInTheDocument();
  await act(async () => pending.reject(new Error("old failure")));
  expect(screen.queryByText("task.InvalidTorrent")).not.toBeInTheDocument();
  expect(screen.getByText("common.Submit")).toBeInTheDocument();
});

it.each(["close", "switch", "remove"])(
  "ignores an old parse result after %s and clears the v2 state",
  async (action) => {
    const pending = deferredParse();
    parseTorrent.mockReturnValueOnce(pending.promise);
    const ref = openDialog("torrent");
    await upload("old.torrent");
    await act(async () => {
      if (action === "close") ref.current?.close();
      if (action === "switch")
        fireEvent.click(screen.getByRole("tab", { name: "common.FromUrl" }));
      if (action === "remove")
        fireEvent.change(
          screen.getByRole("dialog").querySelector('input[type="file"]')!,
          { target: { files: [] } },
        );
    });
    if (action === "close") act(() => ref.current?.open("torrent"));
    await act(async () => pending.resolve(parsedTorrent("v2")));
    expect(screen.queryByText("one.txt")).not.toBeInTheDocument();
    expect(
      screen.queryByText("task.UnsupportedTorrentV2"),
    ).not.toBeInTheDocument();
    if (action === "switch")
      fireEvent.click(
        screen.getByRole("tab", { name: "common.FromTorrentFile" }),
      );
    await upload("fresh.torrent");
    expect(await screen.findByText("one.txt")).toBeInTheDocument();
    expect(screen.getByText("common.Submit")).toBeInTheDocument();
  },
);

it("retains edits on submission failure and clears them when reopened", async () => {
  jest.mocked(addTaskApi).mockRejectedValue(new Error("offline"));
  const ref = openDialog();
  fireEvent.change(screen.getByLabelText("common.DownloadLink"), {
    target: { value: "https://example.test/file" },
  });
  fireEvent.change(screen.getByLabelText("task.UserAgent"), {
    target: { value: "Custom/1.0" },
  });
  fireEvent.click(screen.getByText("common.Submit"));
  await waitFor(() => expect(Notice.error).toHaveBeenCalledWith("offline"));
  expect(screen.getByLabelText("task.UserAgent")).toHaveValue("Custom/1.0");
  fireEvent.click(screen.getByText("common.Cancel"));
  act(() => ref.current?.open());
  expect(screen.getByLabelText("task.UserAgent")).toHaveValue("");
  expect(screen.getByLabelText("common.DownloadLink")).toHaveValue("");
});

it("submits once and keeps the dialog locked until the task is accepted", async () => {
  let accept!: (id: string) => void;
  jest.mocked(addTaskApi).mockReturnValue(
    new Promise<string>((resolve) => {
      accept = resolve;
    }),
  );
  openDialog();
  fireEvent.change(screen.getByLabelText("common.DownloadLink"), {
    target: { value: "https://example.test/file" },
  });
  fireEvent.change(screen.getByLabelText("task.Splits"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByText("common.Submit"));
  await waitFor(() => expect(addTaskApi).toHaveBeenCalledTimes(1));
  expect(addTaskApi).toHaveBeenCalledWith("https://example.test/file", {
    dir: "Downloads",
    out: "",
  });
  expect(screen.getByLabelText("task.UserAgent")).toBeDisabled();
  fireEvent.submit(screen.getByRole("dialog"));
  fireEvent.click(screen.getByText("common.Cancel"));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await act(async () => accept("task-id"));
  expect(addTaskApi).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});
