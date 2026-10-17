import { act, renderHook, waitFor } from "@testing-library/react";

import {
  allowCapture,
  request,
  subscribe,
} from "../apps/extensions/src/client";
import {
  defaults,
  type Reply,
  type Snapshot,
} from "../apps/extensions/src/model";
import { useExtension } from "../apps/extensions/src/useExtension";

jest.mock("../apps/extensions/src/client", () => ({
  ...jest.requireActual("../apps/extensions/src/client"),
  isExtension: true,
  allowCapture: jest.fn(),
  request: jest.fn(),
  subscribe: jest.fn(),
}));

const mockRequest = jest.mocked(request);
const mockSubscribe = jest.mocked(subscribe);
const mockAllowCapture = jest.mocked(allowCapture);
const snapshot: Snapshot = {
  preferences: defaults,
  resources: [],
  tabId: 7,
  tabTitle: "Current page",
  tabUrl: "https://example.com/",
};

beforeEach(() => {
  jest.resetAllMocks();
  mockRequest.mockResolvedValue({ ok: true, snapshot });
  mockAllowCapture.mockResolvedValue(true);
  mockSubscribe.mockReturnValue(jest.fn());
});

it("loads the active tab and removes subscriptions on unmount", async () => {
  const unsubscribe = jest.fn();
  mockSubscribe.mockReturnValue(unsubscribe);
  const { result, unmount } = renderHook(useExtension);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.snapshot).toEqual(snapshot);
  unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it("keeps the latest active-tab snapshot when refreshes finish out of order", async () => {
  let finishInitial: (reply: Reply) => void = () => undefined;
  mockRequest.mockImplementationOnce(
    () => new Promise((resolve) => (finishInitial = resolve)),
  );
  const { result } = renderHook(useExtension);
  const next = { ...snapshot, tabId: 8, tabTitle: "Next page" };
  mockRequest.mockResolvedValue({ ok: true, snapshot: next });
  await act(async () => {
    await result.current.refresh();
    finishInitial({ ok: true, snapshot });
  });
  expect(result.current.snapshot).toEqual(next);
});

it("leaves settings unchanged when website access is denied", async () => {
  const { result } = renderHook(useExtension);
  await waitFor(() => expect(result.current.loading).toBe(false));
  mockRequest.mockClear();
  mockAllowCapture.mockResolvedValue(false);
  await act(async () => {
    await result.current.save({ ...defaults, sniffing: true });
  });
  expect(mockAllowCapture).toHaveBeenCalledTimes(1);
  expect(mockRequest).not.toHaveBeenCalled();
  expect(result.current.snapshot.preferences.sniffing).toBe(false);
  expect(result.current.error).toContain("Website access was not granted");
  expect(result.current.busy).toBe(false);
});

it("saves appearance changes without requesting website access", async () => {
  const { result } = renderHook(useExtension);
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.save({ ...defaults, theme: "dark" });
  });
  expect(mockAllowCapture).not.toHaveBeenCalled();
  expect(mockRequest).toHaveBeenCalledWith({
    type: "preferences",
    preferences: { ...defaults, theme: "dark" },
    secret: undefined,
  });
  expect(result.current.message).toBe("Settings saved.");
});

it("reports partial sends and refreshes confirmed resources", async () => {
  const { result } = renderHook(useExtension);
  await waitFor(() => expect(result.current.loading).toBe(false));
  mockRequest.mockResolvedValueOnce({
    ok: true,
    sent: ["accepted"],
    failed: ["retry"],
  });
  await act(async () => {
    await result.current.send(["accepted", "retry"]);
  });
  expect(mockRequest).toHaveBeenCalledWith({
    type: "send",
    tabId: 7,
    ids: ["accepted", "retry"],
  });
  expect(mockRequest).toHaveBeenLastCalledWith({ type: "snapshot" });
  expect(result.current.message).toBe("1 resource sent to Motrix.");
  expect(result.current.error).toContain("1 could not be confirmed");
  expect(result.current.connected).toBe(true);
  expect(result.current.busy).toBe(false);
});
