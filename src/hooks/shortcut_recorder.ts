import { useLatest, useLockFn, useMemoizedFn } from "ahooks";
import { useEffect, useReducer, useRef } from "react";

import type { GlobalShortcutAction } from "@/constant/shortcuts";
import { createShortcutRecordingSession } from "@/services/shortcut_recording";
import { type ShortcutError, shortcutError } from "@/services/shortcuts";

type RecorderError = ShortcutError | "recording_failed";
interface Editor {
  action: GlobalShortcutAction;
  candidate: string;
  error: RecorderError | null;
}
export type ShortcutRecorderState =
  | { phase: "idle"; error: RecorderError | null }
  | { phase: "clearing"; action: GlobalShortcutAction }
  | {
      phase:
        | "starting"
        | "recording"
        | "saving"
        | "stopping"
        | "restore_failed";
      editor: Editor;
    };

type Event =
  | { type: "start"; action: GlobalShortcutAction }
  | { type: "clear"; action: GlobalShortcutAction }
  | { type: "ready" | "save" | "stop" | "restore_failed" }
  | { type: "candidate"; value: string }
  | { type: "save_failed"; error: RecorderError }
  | { type: "idle"; error?: RecorderError };

function reduce(
  state: ShortcutRecorderState,
  event: Event,
): ShortcutRecorderState {
  switch (event.type) {
    case "start":
      return {
        phase: "starting",
        editor: { action: event.action, candidate: "", error: null },
      };
    case "clear":
      return { phase: "clearing", action: event.action };
    case "idle":
      return { phase: "idle", error: event.error ?? null };
    case "ready":
      return state.phase === "starting"
        ? { ...state, phase: "recording" }
        : state;
    case "candidate":
      return state.phase === "recording"
        ? {
            ...state,
            editor: { ...state.editor, candidate: event.value, error: null },
          }
        : state;
    case "save":
      return state.phase === "recording"
        ? { ...state, phase: "saving" }
        : state;
    case "stop":
      return "editor" in state ? { ...state, phase: "stopping" } : state;
    case "restore_failed":
      return "editor" in state
        ? {
            ...state,
            phase: "restore_failed",
            editor: { ...state.editor, error: "recording_failed" },
          }
        : state;
    case "save_failed":
      return "editor" in state
        ? {
            ...state,
            phase: "recording",
            editor: { ...state.editor, error: event.error },
          }
        : state;
  }
}

interface Lifecycle {
  session: ReturnType<typeof createShortcutRecordingSession>;
  version: number;
}

export function useShortcutRecorder(
  save: (action: GlobalShortcutAction, value: string) => Promise<void>,
) {
  const [state, dispatch] = useReducer(reduce, { phase: "idle", error: null });
  const currentState = useLatest(state);
  const saveLatest = useLatest(save);
  const lifecycle = useRef<Lifecycle | null>(null);
  const isCurrent = (run: Lifecycle, version: number) =>
    lifecycle.current === run && run.version === version;

  const finish = async (
    run: Lifecycle,
    version: number,
    error?: RecorderError,
  ) => {
    dispatch({ type: "stop" });
    try {
      await run.session.stop();
      if (isCurrent(run, version)) dispatch({ type: "idle", error });
    } catch {
      if (isCurrent(run, version)) dispatch({ type: "restore_failed" });
    }
  };

  const cancel = useMemoizedFn(async () => {
    const run = lifecycle.current;
    if (!run || !("editor" in currentState.current)) return;
    await finish(run, ++run.version);
  });

  useEffect(() => {
    const run = { session: createShortcutRecordingSession(), version: 0 };
    lifecycle.current = run;
    const blur = () => {
      if (
        currentState.current.phase !== "saving" &&
        currentState.current.phase !== "stopping"
      )
        void cancel();
    };
    window.addEventListener("blur", blur);
    return () => {
      lifecycle.current = null;
      window.removeEventListener("blur", blur);
      void run.session.dispose().catch(() => {
        console.error(
          "Failed to restore global shortcut actions after recording ended",
        );
      });
    };
  }, [cancel, currentState]);

  const start = useLockFn(async (action: GlobalShortcutAction) => {
    const run = lifecycle.current;
    if (!run || currentState.current.phase !== "idle") return;
    const version = ++run.version;
    dispatch({ type: "start", action });
    try {
      await run.session.start();
      if (isCurrent(run, version)) dispatch({ type: "ready" });
    } catch {
      if (isCurrent(run, version))
        await finish(run, version, "recording_failed");
    }
  });

  const confirm = useLockFn(async () => {
    const run = lifecycle.current;
    const snapshot = currentState.current;
    if (!run || snapshot.phase !== "recording" || !snapshot.editor.candidate)
      return;
    const version = run.version;
    dispatch({ type: "save" });
    try {
      await saveLatest.current(
        snapshot.editor.action,
        snapshot.editor.candidate,
      );
      if (isCurrent(run, version)) await finish(run, version);
    } catch (reason) {
      if (isCurrent(run, version))
        dispatch({ type: "save_failed", error: shortcutError(reason) });
    }
  });

  const clear = useLockFn(async (action: GlobalShortcutAction) => {
    const run = lifecycle.current;
    if (!run || currentState.current.phase !== "idle") return;
    const version = ++run.version;
    dispatch({ type: "clear", action });
    try {
      await saveLatest.current(action, "");
      if (isCurrent(run, version)) dispatch({ type: "idle" });
    } catch (reason) {
      if (isCurrent(run, version))
        dispatch({ type: "idle", error: shortcutError(reason) });
    }
  });

  return {
    state,
    start,
    cancel,
    confirm,
    clear,
    record: (value: string) => dispatch({ type: "candidate", value }),
  };
}
