import { check, type Update } from "@tauri-apps/plugin-updater";

import { Notice } from "@/components/Notice";
import {
  checkForUpdates,
  fetchUpdate,
  useUpdateStore,
} from "@/services/updates";

jest.mock("@tauri-apps/plugin-updater", () => ({ check: jest.fn() }));
jest.mock("@/components/Notice", () => ({
  Notice: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("i18next", () => ({ t: (key: string) => key }));

beforeEach(() => {
  jest.clearAllMocks();
  useUpdateStore.setState({ update: null, open: false });
});

it("shares an in-flight automatic check with concurrent manual checks", async () => {
  let resolve!: (update: Update) => void;
  jest.mocked(check).mockReturnValue(
    new Promise((accept) => {
      resolve = accept;
    }),
  );
  const automatic = fetchUpdate();
  const manual = checkForUpdates();
  const repeated = checkForUpdates();
  const update = { version: "1.0.0" } as Update;
  resolve(update);
  await Promise.all([automatic, manual, repeated]);
  expect(check).toHaveBeenCalledTimes(1);
  expect(useUpdateStore.getState()).toEqual({ update, open: true });
});

it("reports the latest version on a manual check", async () => {
  jest.mocked(check).mockResolvedValue(null);
  await checkForUpdates();
  expect(Notice.success).toHaveBeenCalledWith("update.CurrentlyOnLatest");
  expect(useUpdateStore.getState().open).toBe(false);
});

it("reports a failed check and allows retry", async () => {
  jest
    .mocked(check)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(null);
  await checkForUpdates();
  expect(Notice.error).toHaveBeenCalledWith("offline");
  await checkForUpdates();
  expect(check).toHaveBeenCalledTimes(2);
  expect(Notice.success).toHaveBeenCalled();
});

it("keeps an open update dialog stable during background checks", async () => {
  const update = { version: "1.0.0" } as Update;
  useUpdateStore.setState({ update, open: true });
  await expect(fetchUpdate()).resolves.toBe(update);
  expect(check).not.toHaveBeenCalled();
});

it("releases a previous update resource after refreshing a closed dialog", async () => {
  const close = jest.fn().mockResolvedValue(undefined);
  useUpdateStore.setState({
    update: { version: "1.0.0", close } as unknown as Update,
    open: false,
  });
  jest.mocked(check).mockResolvedValue(null);
  await fetchUpdate();
  expect(close).toHaveBeenCalledTimes(1);
  expect(useUpdateStore.getState()).toEqual({ update: null, open: false });
});
