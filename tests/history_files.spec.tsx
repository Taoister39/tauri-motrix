import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";

import { useHistoryFiles } from "@/hooks/history_files";
import type { DownloadHistoryVO } from "@/services/download_history";
import {
  type HistoryFileInspection,
  inspectHistoryPaths,
} from "@/services/history_files";

jest.mock("@/services/history_files", () => ({
  inspectHistoryPaths: jest.fn(),
}));

const history = [{ path: "C:\\Downloads\\file.png" }] as DownloadHistoryVO[];
const present: HistoryFileInspection = {
  path: history[0].path,
  state: "present",
  kind: "file",
  revision: "1:100",
};

beforeEach(() => jest.clearAllMocks());

it("refreshes missing and restored files when the window regains focus", async () => {
  jest.mocked(inspectHistoryPaths).mockResolvedValue([present]);
  const { result, unmount } = renderHook(() => useHistoryFiles(history));
  await waitFor(() =>
    expect(result.current.get(present.path)?.state).toBe("present"),
  );
  jest
    .mocked(inspectHistoryPaths)
    .mockResolvedValue([{ ...present, state: "missing", revision: null }]);
  fireEvent.focus(window);
  await waitFor(() =>
    expect(result.current.get(present.path)?.state).toBe("missing"),
  );
  jest.mocked(inspectHistoryPaths).mockResolvedValue([present]);
  fireEvent.focus(window);
  await waitFor(() =>
    expect(result.current.get(present.path)?.state).toBe("present"),
  );
  unmount();
  fireEvent.focus(window);
  expect(inspectHistoryPaths).toHaveBeenCalledTimes(3);
});

it("ignores an older inspection that finishes after a newer refresh", async () => {
  let resolve: (value: HistoryFileInspection[]) => void = () => {};
  jest
    .mocked(inspectHistoryPaths)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    )
    .mockResolvedValue([present]);
  const { result } = renderHook(() => useHistoryFiles(history));
  fireEvent.focus(window);
  await waitFor(() =>
    expect(result.current.get(present.path)?.state).toBe("present"),
  );
  await act(async () => resolve([{ ...present, state: "missing" }]));
  expect(result.current.get(present.path)?.state).toBe("present");
});

it("reports inspection failures as unknown rather than missing", async () => {
  jest
    .mocked(inspectHistoryPaths)
    .mockRejectedValue(new Error("Access denied"));
  const { result } = renderHook(() => useHistoryFiles(history));
  await waitFor(() =>
    expect(result.current.get(present.path)?.state).toBe("unknown"),
  );
});

it("deduplicates paths and keeps native inspection batches bounded", async () => {
  jest
    .mocked(inspectHistoryPaths)
    .mockImplementation(async (paths) =>
      paths.map((path) => ({ ...present, path })),
    );
  const items = Array.from({ length: 260 }, (_, id) => ({
    path: `C:\\Downloads\\${id}`,
  })) as DownloadHistoryVO[];
  const duplicates = [...items, ...items];
  const { result } = renderHook(() => useHistoryFiles(duplicates));
  await waitFor(() => expect(result.current.size).toBe(260));
  expect(
    jest.mocked(inspectHistoryPaths).mock.calls.map(([paths]) => paths.length),
  ).toEqual([128, 128, 4]);
});
