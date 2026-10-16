import { check, type Update } from "@tauri-apps/plugin-updater";
import { t } from "i18next";
import { create } from "zustand";

import { Notice } from "@/components/Notice";

export const useUpdateStore = create<{
  update: Update | null;
  open: boolean;
}>(() => ({ update: null, open: false }));

let request: Promise<Update | null> | undefined;
let manualRequest: Promise<void> | undefined;

export function fetchUpdate() {
  const current = useUpdateStore.getState();
  if (current.open && current.update) return Promise.resolve(current.update);
  return (request ??= check()
    .then((update) => {
      const previous = useUpdateStore.getState().update;
      useUpdateStore.setState({ update, open: false });
      if (previous && previous !== update)
        void previous.close().catch(() => {});
      return update;
    })
    .finally(() => {
      request = undefined;
    }));
}

export function checkForUpdates() {
  return (manualRequest ??= fetchUpdate()
    .then((update) => {
      if (update) useUpdateStore.setState({ open: true });
      else Notice.success(t("update.CurrentlyOnLatest"));
    })
    .catch((error: unknown) => {
      Notice.error(error instanceof Error ? error.message : String(error));
    })
    .finally(() => {
      manualRequest = undefined;
    }));
}
