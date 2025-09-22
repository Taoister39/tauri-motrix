import { useLocalStorageState } from "ahooks";

export function useSyncTrackerLocalStorage() {
  const [lastSyncTrackerTime, setLastSyncTrackerTime] = useLocalStorageState<
    number | undefined
  >("last-sync-tracker-time", {
    listenStorageChange: true,
  });
  const [isAutoSyncTracker, setIsAutoSyncTracker] = useLocalStorageState(
    "auto-sync-tracker",
    {
      defaultValue: true,
      listenStorageChange: true,
    },
  );

  return {
    lastSyncTrackerTime,
    setLastSyncTrackerTime,
    isAutoSyncTracker,
    setIsAutoSyncTracker,
  };
}
