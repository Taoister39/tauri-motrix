import { useLatest } from "ahooks";
import { type RefObject, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { AddTaskDialogRef } from "@/business/task/AddTaskDialog";
import { Notice } from "@/components/Notice";
import { TASK_STATUS_ENUM } from "@/constant/task";
import { showDialog } from "@/services/dialog";
import { connectTray, readTorrentFile } from "@/services/tray";
import { checkForUpdates } from "@/services/updates";
import { useAria2StateStore } from "@/store/aria2_state";
import { useTaskStore } from "@/store/task";

export function useTray(addRef: RefObject<AddTaskDialogRef | null>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const latest = useLatest({ t, navigate });
  useEffect(() => {
    const controller = new AbortController();
    const connection = connectTray(
      {
        async action(action) {
          const { t, navigate } = latest.current;
          switch (action.action) {
            case "add_task_from_shortcut":
              addRef.current?.openFromShortcut();
              break;
            case "add_task":
              addRef.current?.open("url");
              break;
            case "open_torrent": {
              try {
                const file = await readTorrentFile(action.path);
                if (!controller.signal.aborted)
                  addRef.current?.open("torrent", file);
              } catch {
                Notice.error(t("tray.TorrentReadFailed"));
              }
              break;
            }
            case "downloads": {
              const store = useTaskStore.getState();
              store.setKeyword("");
              store.setFetchType(TASK_STATUS_ENUM.Active);
              navigate("/task-start", { state: { resetSearch: Date.now() } });
              break;
            }
            case "settings":
              navigate("/settings");
              break;
            case "check_update":
              void checkForUpdates();
              break;
          }
        },
        reports(reports) {
          const { t } = latest.current;
          for (const report of reports) {
            void showDialog({
              title: t("tray.ControlFailedTitle"),
              message: t("tray.ControlReport", {
                action: t(
                  report.action === "pause"
                    ? "tray.PauseAll"
                    : "tray.ResumeAll",
                ),
                succeeded: report.succeeded,
                failed: report.failures.length,
              }),
              details: report.failures.map(
                (failure) =>
                  `${failure.engine}${failure.id ? ` (${failure.id})` : ""}: ${t(`tray.Failure_${failure.reason}`)}`,
              ),
              actions: [],
              cancelLabel: t("common.Ok"),
            });
          }
        },
        changed() {
          void Promise.allSettled([
            useTaskStore.getState().fetchTasks(),
            useAria2StateStore.getState().fetchGlobalStat(),
          ]);
        },
        error() {
          Notice.error(latest.current.t("tray.ActionFailed"));
        },
      },
      controller.signal,
    ).catch(() => {
      if (!controller.signal.aborted)
        Notice.error(latest.current.t("tray.ActionFailed"));
      return () => {};
    });
    return () => {
      controller.abort();
      void connection.then((unlisten) => unlisten());
    };
  }, [addRef, latest]);
}
