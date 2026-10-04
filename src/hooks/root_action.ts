import { emit } from "@tauri-apps/api/event";
import { useMount } from "ahooks";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useSyncTrackerLocalStorage } from "@/hooks/useSyncTrackerLocalStorage";
import { useTaskStore } from "@/store/task";
import {
  convertLineToComma,
  reduceTrackerString,
  syncTrackerFromSourceHelper,
} from "@/utils/tracker";

import { useAria2 } from "./aria2";
import { useMotrix } from "./motrix";

export function useRootAction() {
  const registerEvent = useTaskStore((store) => store.registerEvent);

  useMount(() => {
    registerEvent();
    emit("motrix://web-ready");
  });

  useAutoSyncTacker();

  useSyncMotrix();

  useI18n();
}

export function useAutoSyncTacker() {
  const { patchAria2 } = useAria2();
  const { motrix } = useMotrix();

  const { isAutoSyncTracker, setLastSyncTrackerTime, lastSyncTrackerTime } =
    useSyncTrackerLocalStorage();
  // auto sync tracker list
  useEffect(() => {
    const fn = () => {
      const trackerSource = motrix?.tracker_source;
      const isNeedSync = lastSyncTrackerTime
        ? dayjs().diff(lastSyncTrackerTime, "day") >= 1
        : true;

      if (isAutoSyncTracker && trackerSource && isNeedSync) {
        const now = Date.now();

        syncTrackerFromSourceHelper(trackerSource).then(async (line) => {
          const btTracker = reduceTrackerString(convertLineToComma(line));

          await patchAria2({
            "bt-tracker": btTracker,
          });
          setLastSyncTrackerTime(now);
        });
      }
    };

    fn();
    const timer = setInterval(fn, 1000 * 60 * 30);

    return () => {
      clearInterval(timer);
    };
  }, [
    isAutoSyncTracker,
    setLastSyncTrackerTime,
    motrix?.tracker_source,
    patchAria2,
    lastSyncTrackerTime,
  ]);
}

export function useSyncMotrix() {
  const { motrix } = useMotrix();
  const syncByMotrix = useTaskStore((store) => store.syncByMotrix);

  useEffect(() => {
    if (motrix) {
      syncByMotrix(motrix);
    }
  }, [motrix, syncByMotrix]);
}

export function useI18n() {
  const { i18n } = useTranslation();
  const { motrix } = useMotrix();

  useEffect(() => {
    if (motrix?.language) {
      i18n.changeLanguage(motrix.language);
    }
  }, [i18n, motrix?.language]);
}
