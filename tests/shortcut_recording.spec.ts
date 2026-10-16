import { createShortcutRecordingSession } from "@/services/shortcut_recording";
import { setGlobalShortcutRecording } from "@/services/shortcuts";

jest.mock("@/services/shortcuts", () => ({
  setGlobalShortcutRecording: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(setGlobalShortcutRecording).mockReset().mockResolvedValue();
});

it("finishes a pending start before releasing a disposed session", async () => {
  let finish!: () => void;
  jest.mocked(setGlobalShortcutRecording).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const session = createShortcutRecordingSession();
  const start = session.start();
  await Promise.resolve();
  const dispose = session.dispose();
  expect(setGlobalShortcutRecording).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([start, dispose]);
  expect(
    jest
      .mocked(setGlobalShortcutRecording)
      .mock.calls.map(([enabled]) => enabled),
  ).toEqual([true, false]);
});

it("does not let an old session stop a new owner", async () => {
  const previous = createShortcutRecordingSession();
  const current = createShortcutRecordingSession();
  await previous.start();
  await current.start();
  await previous.dispose();
  expect(
    jest
      .mocked(setGlobalShortcutRecording)
      .mock.calls.map(([enabled]) => enabled),
  ).toEqual([true, false, true]);
  await current.dispose();
  expect(setGlobalShortcutRecording).toHaveBeenLastCalledWith(false);
});

it("retries release during disposal and never starts a disposed session", async () => {
  const session = createShortcutRecordingSession();
  await session.start();
  jest
    .mocked(setGlobalShortcutRecording)
    .mockRejectedValueOnce(new Error("IPC unavailable"));
  await session.dispose();
  await session.start();
  expect(
    jest
      .mocked(setGlobalShortcutRecording)
      .mock.calls.map(([enabled]) => enabled),
  ).toEqual([true, false, false]);
});
