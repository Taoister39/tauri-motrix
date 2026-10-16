import { setGlobalShortcutRecording } from "@/services/shortcuts";

let pending = Promise.resolve();
let owner: symbol | undefined;

function enqueue(operation: () => Promise<void>) {
  const next = pending.then(operation);
  pending = next.catch(() => {});
  return next;
}

export function createShortcutRecordingSession() {
  const token = Symbol();
  let disposed = false;

  const stop = () =>
    enqueue(async () => {
      if (owner !== token) return;
      await setGlobalShortcutRecording(false);
      owner = undefined;
    });

  return {
    start: () =>
      enqueue(async () => {
        if (disposed) return;
        if (owner !== undefined && owner !== token) {
          await setGlobalShortcutRecording(false);
          owner = undefined;
        }
        owner = token;
        await setGlobalShortcutRecording(true);
      }),
    stop,
    dispose: () => {
      disposed = true;
      return stop().catch(stop);
    },
  };
}
