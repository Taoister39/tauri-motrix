import { create } from "zustand";

import * as aria2Api from "@/services/download";
import { usePollingStore } from "@/store/polling";

export interface Aria2StateStore {
  globalStat: aria2Api.Aria2GlobalStat;
  fetchGlobalStat: () => void;
}

const DEFAULT_STAT = {
  downloadSpeed: "0",
  uploadSpeed: "0",
  numActive: "0",
  numWaiting: "0",
  numStopped: "0",
};

export const useAria2StateStore = create<Aria2StateStore>((set) => ({
  globalStat: DEFAULT_STAT,
  async fetchGlobalStat() {
    const stat = await aria2Api.getGlobalStatApi();
    set({ globalStat: stat });

    usePollingStore.getState().updateInterval(stat);
  },
}));
