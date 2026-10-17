import { useCallback, useEffect, useRef, useState } from "react";

import {
  allowCapture,
  emptySnapshot,
  isExtension,
  request,
  subscribe,
} from "./client";
import type { Preferences } from "./model";

export function useExtension() {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(isExtension);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const mounted = useRef(false);
  const generation = useRef(0);
  const operationPending = useRef(false);
  const refresh = useCallback(async () => {
    if (!isExtension) return;
    const current = ++generation.current;
    try {
      const reply = await request({ type: "snapshot" });
      if (!mounted.current || current !== generation.current) return;
      if (reply.ok && reply.snapshot) setSnapshot(reply.snapshot);
      else if (!reply.ok) setError(reply.error);
    } catch {
      if (mounted.current)
        setError("The extension could not load. Close and reopen the popup.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const unsubscribe = subscribe(() => {
      void refresh();
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [refresh]);
  async function run(operation: () => Promise<void>) {
    if (operationPending.current) return;
    operationPending.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The operation failed. Try again.",
      );
    } finally {
      operationPending.current = false;
      setBusy(false);
    }
  }
  function save(preferences: Preferences, secret?: string) {
    return run(async () => {
      if (!isExtension) {
        setSnapshot((s) => ({ ...s, preferences }));
        return;
      }
      if (
        (preferences.sniffing && !snapshot.preferences.sniffing) ||
        (preferences.takeover && !snapshot.preferences.takeover)
      ) {
        if (!(await allowCapture()))
          throw new Error(
            "Website access was not granted. Your settings have not changed.",
          );
      }
      const reply = await request({ type: "preferences", preferences, secret });
      if (!reply.ok) throw new Error(reply.error);
      setConnected(false);
      await refresh();
      setMessage("Settings saved.");
    });
  }
  function connect() {
    return run(async () => {
      const reply = await request({ type: "connect" });
      setConnected(reply.ok);
      if (!reply.ok) throw new Error(reply.error);
      setMessage("Connected to Motrix.");
    });
  }
  function send(ids: string[]) {
    return run(async () => {
      if (snapshot.tabId === undefined || !ids.length) return;
      const reply = await request({ type: "send", tabId: snapshot.tabId, ids });
      if (!reply.ok) {
        setConnected(false);
        throw new Error(reply.error);
      }
      const sent = reply.sent?.length || 0,
        failed = reply.failed?.length || 0;
      setMessage(
        `${sent} ${sent === 1 ? "resource" : "resources"} sent to Motrix.`,
      );
      if (failed)
        setError(
          `${failed} could not be confirmed. Check Motrix before retrying to avoid duplicates.`,
        );
      setConnected(sent > 0);
      await refresh();
    });
  }
  function clear() {
    return run(async () => {
      if (snapshot.tabId === undefined) return;
      const reply = await request({ type: "clear", tabId: snapshot.tabId });
      if (!reply.ok) throw new Error(reply.error);
      await refresh();
    });
  }
  return {
    snapshot,
    loading,
    busy,
    connected,
    error,
    message,
    save,
    connect,
    send,
    clear,
    refresh,
    dismissError: () => setError(""),
    dismissMessage: () => setMessage(""),
  };
}
