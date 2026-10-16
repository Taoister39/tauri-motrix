import useSWR, { useSWRConfig } from "swr";

import type { GlobalShortcutAction } from "@/constant/shortcuts";
import { getMotrixConfig, patchMotrixConfig } from "@/services/cmd";
import { getGlobalShortcutStatus } from "@/services/shortcuts";

async function loadSettings() {
  const [config, status] = await Promise.all([
    getMotrixConfig(),
    getGlobalShortcutStatus(),
  ]);
  return { config, status };
}

export function useGlobalShortcutSettings() {
  const { mutate: mutateCache } = useSWRConfig();
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "getGlobalShortcutSettings",
    loadSettings,
  );

  const refresh = async () => {
    const next = await mutate();
    if (next) await mutateCache("getMotrixConfig", next.config, false);
  };

  const save = async (action: GlobalShortcutAction, value: string) => {
    await patchMotrixConfig({ [action.key]: value });
    // A refresh failure must not turn a completed save into a failed save.
    await refresh().catch(() => {});
  };

  return { data, error, isLoading, isValidating, refresh, save };
}
