import { create } from "zustand";

import { Aria2GlobalStat } from "@/services/aria2c_api";
import { useAria2StateStore } from "@/store/aria2_state";
import { useTaskStore } from "@/store/task";

export interface PollingStore {
  timer?: ReturnType<typeof setTimeout>;
  interval: number;
  polling: () => void;
  updateInterval: (stat?: Aria2GlobalStat) => void;
  resetInterval: () => void;
  stop: () => void;
}

const DEFAULT_INTERVAL = 1000;
const MAX_INTERVAL = 6000;
const MIN_INTERVAL = 500;

export const usePollingStore = create<PollingStore>((set, get) => ({
  timer: undefined,
  interval: DEFAULT_INTERVAL,

  polling() {
    const { interval, polling } = get();
    const { fetchTasks } = useTaskStore.getState();
    const { fetchGlobalStat } = useAria2StateStore.getState();

    const timer = setTimeout(() => {
      fetchTasks();
      fetchGlobalStat();
      polling();
    }, interval);
    set({ timer });
  },
  updateInterval(stat) {
    const { interval: currentInterval } = get();
    const numActive =
      stat?.numActive && !isNaN(Number(stat.numActive))
        ? Number(stat.numActive)
        : 0;

    let interval: number;
    if (numActive > 0) {
      const newInterval = DEFAULT_INTERVAL - 100 * numActive;
      interval = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, newInterval));
    } else {
      const newInterval = Math.max(MIN_INTERVAL, currentInterval + 100);
      interval = newInterval;
    }
    set({ interval });
  },
  resetInterval() {
    set({ interval: DEFAULT_INTERVAL });
  },
  stop() {
    const { timer } = get();
    if (timer) {
      clearTimeout(timer);
      set({ timer: undefined });
    }
  },
}));
