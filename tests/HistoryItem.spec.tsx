import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import HistoryItem from "@/business/history/HistoryItem";
import { DOWNLOAD_ENGINE } from "@/constant/task";
import type { DownloadHistoryVO } from "@/services/download_history";
import {
  getHistoryThumbnail,
  type HistoryFileInspection,
} from "@/services/history_files";

jest.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: jest.fn(),
}));
jest.mock("@tauri-apps/plugin-opener", () => ({ revealItemInDir: jest.fn() }));
jest.mock("@/services/history_files", () => ({
  getHistoryThumbnail: jest.fn(),
}));
jest.mock("@/components/Notice", () => ({ Notice: { error: jest.fn() } }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const history: DownloadHistoryVO = {
  id: 1,
  link: "https://example.com/picture.png",
  path: "C:\\Downloads\\picture.png",
  engine: DOWNLOAD_ENGINE.Aria2,
  name: "picture.png",
  created_at: 1700000000,
  updated_at: 1700000000,
  total_length: 1024,
  plat_id: "gid",
  json_ext: {},
};
const present: HistoryFileInspection = {
  path: history.path,
  state: "present",
  kind: "file",
  revision: "1:1024",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getHistoryThumbnail).mockResolvedValue(null);
  jest.mocked(writeText).mockResolvedValue();
  jest.mocked(revealItemInDir).mockResolvedValue();
});

it("exposes three direct actions without opening a menu", async () => {
  const onDelete = jest.fn();
  render(<HistoryItem history={history} file={present} onDelete={onDelete} />);
  fireEvent.click(screen.getByRole("button", { name: "history.RevealFile" }));
  fireEvent.click(screen.getByRole("button", { name: "task.CopyLink" }));
  fireEvent.click(screen.getByRole("button", { name: "task.Delete" }));
  expect(revealItemInDir).toHaveBeenCalledWith(history.path);
  expect(writeText).toHaveBeenCalledWith(history.link);
  expect(onDelete).toHaveBeenCalledWith(history.id);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  await waitFor(() => expect(getHistoryThumbnail).toHaveBeenCalled());
});

it("strikes through missing files and restores them without removing history", async () => {
  const onDelete = jest.fn();
  const { rerender } = render(
    <HistoryItem
      history={history}
      file={{ ...present, state: "missing", revision: null }}
      onDelete={onDelete}
    />,
  );
  expect(screen.getByText(history.name)).toHaveStyle({
    textDecoration: "line-through",
  });
  expect(
    screen.getByRole("button", { name: "history.RevealFile" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "task.CopyLink" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "task.Delete" })).toBeEnabled();
  expect(getHistoryThumbnail).not.toHaveBeenCalled();
  rerender(
    <HistoryItem history={history} file={present} onDelete={onDelete} />,
  );
  expect(screen.getByText(history.name)).not.toHaveStyle({
    textDecoration: "line-through",
  });
  expect(
    screen.getByRole("button", { name: "history.RevealFile" }),
  ).toBeEnabled();
  await waitFor(() => expect(getHistoryThumbnail).toHaveBeenCalled());
});

it("renders actual previews and falls back on image load errors", async () => {
  jest
    .mocked(getHistoryThumbnail)
    .mockResolvedValue("data:image/png;base64,preview");
  const { container } = render(
    <HistoryItem history={history} file={present} onDelete={jest.fn()} />,
  );
  await waitFor(() =>
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,preview",
    ),
  );
  fireEvent.error(container.querySelector("img")!);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText(history.name)).not.toHaveStyle({
    textDecoration: "line-through",
  });
});

it("renders the executable icon returned by the operating system", async () => {
  jest
    .mocked(getHistoryThumbnail)
    .mockResolvedValue("data:image/png;base64,executable-icon");
  const executable = {
    ...history,
    path: "C:\\Downloads\\installer.exe",
    name: "installer.exe",
  };
  const { container } = render(
    <HistoryItem
      history={executable}
      file={{ ...present, path: executable.path }}
      onDelete={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,executable-icon",
    ),
  );
  expect(getHistoryThumbnail).toHaveBeenCalledWith(
    executable.path,
    present.revision,
  );
});

it("requests the system image for a directory before using a folder placeholder", async () => {
  jest
    .mocked(getHistoryThumbnail)
    .mockResolvedValue("data:image/png;base64,folder-icon");
  const { container } = render(
    <HistoryItem
      history={history}
      file={{ ...present, kind: "directory" }}
      onDelete={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,folder-icon",
    ),
  );
});

it.each(["present", "unknown"] as const)(
  "does not treat a preview failure as a deleted file (%s)",
  async (state) => {
    jest
      .mocked(getHistoryThumbnail)
      .mockRejectedValue(new Error("Preview unavailable"));
    render(
      <HistoryItem
        history={history}
        file={{ ...present, state }}
        onDelete={jest.fn()}
      />,
    );
    await act(async () => {});
    expect(screen.getByText(history.name)).not.toHaveStyle({
      textDecoration: "line-through",
    });
    expect(
      screen.getByRole("button", { name: "history.RevealFile" }),
    ).toBeEnabled();
  },
);

it("ignores a pending preview after the file disappears", async () => {
  let resolve: (value: string | null) => void = () => {};
  jest.mocked(getHistoryThumbnail).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { container, rerender } = render(
    <HistoryItem history={history} file={present} onDelete={jest.fn()} />,
  );
  await waitFor(() => expect(getHistoryThumbnail).toHaveBeenCalled());
  rerender(
    <HistoryItem
      history={history}
      file={{ ...present, state: "missing", revision: null }}
      onDelete={jest.fn()}
    />,
  );
  await act(async () => resolve("data:image/png;base64,stale"));
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText(history.name)).toHaveStyle({
    textDecoration: "line-through",
  });
});

it("requests thumbnails only near the visible region and releases its observer", async () => {
  let notify: IntersectionObserverCallback = () => {};
  const disconnect = jest.fn();
  const observe = jest.fn();
  const original = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = jest.fn().mockImplementation((callback) => {
    notify = callback;
    return { observe, disconnect };
  });
  try {
    const { unmount } = render(
      <HistoryItem history={history} file={present} onDelete={jest.fn()} />,
    );
    expect(getHistoryThumbnail).not.toHaveBeenCalled();
    act(() =>
      notify(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    await waitFor(() =>
      expect(getHistoryThumbnail).toHaveBeenCalledWith(
        history.path,
        present.revision,
      ),
    );
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  } finally {
    globalThis.IntersectionObserver = original;
  }
});
