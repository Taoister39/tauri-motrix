import { invoke } from "@tauri-apps/api/core";

import {
  getHistoryThumbnail,
  inspectHistoryPaths,
} from "@/services/history_files";

jest.mock("@tauri-apps/api/core", () => ({ invoke: jest.fn() }));

it("limits thumbnail concurrency, shares pending requests, and separates revisions", async () => {
  const resolvers: ((image: string | null) => void)[] = [];
  jest.mocked(invoke).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvers.push(resolve);
      }),
  );
  const requests = Array.from({ length: 5 }, (_, index) =>
    getHistoryThumbnail(`file-${index}`, "first"),
  );
  expect(invoke).toHaveBeenCalledTimes(4);
  expect(getHistoryThumbnail("file-0", "first")).toBe(requests[0]);
  resolvers[0](null);
  await requests[0];
  await Promise.resolve();
  expect(invoke).toHaveBeenCalledTimes(5);
  const changed = getHistoryThumbnail("file-0", "second");
  expect(changed).not.toBe(requests[0]);
  resolvers.slice(1).forEach((resolve) => resolve(null));
  await Promise.all(requests);
  await Promise.resolve();
  resolvers[resolvers.length - 1]?.(null);
  await changed;
});

it("uses the scoped native inspection command", async () => {
  jest.mocked(invoke).mockResolvedValue([]);
  await inspectHistoryPaths(["C:\\Downloads\\file"]);
  expect(invoke).toHaveBeenLastCalledWith("inspect_history_paths", {
    paths: ["C:\\Downloads\\file"],
  });
});
