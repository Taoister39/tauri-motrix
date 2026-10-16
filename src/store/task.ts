import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { t } from "i18next";
import { mutate } from "swr";
import { create } from "zustand";

import { Notice } from "@/components/Notice";
import { APP_LOG_LEVEL } from "@/constant/log";
import { TASK_STATUS_ENUM } from "@/constant/task";
import { appLog } from "@/services/cmd";
import { showDialog } from "@/services/dialog";
import {
  addTaskApi,
  batchPauseTaskApi,
  batchResumeTaskApi,
  downloadingTasksApi,
  DownloadTask,
  getAria2,
  pauseTaskApi,
  registerVortexEvents,
  resumeTaskApi,
  retryTaskApi,
  stoppedTasksApi,
  taskItemApi,
  taskRef,
  waitingTasksApi,
} from "@/services/download";
import { DownloadOption } from "@/services/download";
import {
  createHistory,
  findOneHistoryByPlatId,
  updateHistoryByPlatId,
} from "@/services/download_history";
import {
  deleteTasks,
  resolveTaskDeletion,
  type TaskDeletionReport,
} from "@/services/task_deletion";
import { usePollingStore } from "@/store/polling";
import { arrayAddOrRemove } from "@/utils/array_add_or_remove";
import { compactUndefined } from "@/utils/compact_undefined";
import {
  checkTaskIsBT,
  getTaskFullPath,
  getTaskName,
  getTaskUri,
  isMagnetTask,
} from "@/utils/task";

export type WrapGid = [{ gid: string }];

interface TaskStore {
  tasks: Array<DownloadTask>;
  fetchType: TASK_STATUS_ENUM;
  keyword: string;
  selectedTaskIds: Array<string>;
  selectedTasks: Array<DownloadTask>;
  deletingTaskIds: string[];
  enableNotify: boolean;
  syncByMotrix: (config: Partial<MotrixConfig>) => void;
  fetchTasks: () => Promise<void>;
  fetchItem: (plat_id: string) => void;
  setFetchType: (type: TASK_STATUS_ENUM) => void;
  setKeyword: (keyword?: string) => void;
  handleTaskSelect: (taskId?: string) => void;
  handleTaskPause: (taskId?: string) => void;
  handleTaskResume: (taskId?: string) => void;
  handleTaskDelete: (taskId?: string) => Promise<void>;
  openTaskFile: (taskId: string) => void;
  copyTaskLink: (taskId: string) => void;
  addTask: (url: string, option: DownloadOption) => void;
  getTaskByGid: (gid: string) => DownloadTask;
  syncToDownloadHistory: (task: DownloadTask) => Promise<void>;
  registerEvent: () => Promise<void>;
  onDownloadStart: (wrap: WrapGid) => Promise<void>;
  onDownloadPause: (wrap: WrapGid) => Promise<void>;
  onDownloadStop: (wrap: WrapGid) => Promise<void>;
  onDownloadComplete: (wrap: WrapGid) => Promise<void>;
  onDownloadError: (wrap: WrapGid) => Promise<void>;
  onBtDownloadComplete: (wrap: WrapGid) => Promise<void>;
}

const aria2EventListeners = (
  [
    "onDownloadStart",
    "onDownloadPause",
    "onDownloadStop",
    "onDownloadComplete",
    "onDownloadError",
    "onBtDownloadComplete",
  ] as const
).map((event) => ({
  event,
  async callback(wrap: WrapGid) {
    try {
      await useTaskStore.getState()[event](wrap);
    } catch {
      try {
        await appLog(
          APP_LOG_LEVEL.Error,
          `[Motrix] aria2 event failed: ${event}, gid: ${wrap[0]?.gid}`,
        );
      } catch {
        return;
      }
    }
  },
}));

async function refreshAria2Task(
  gid: string,
  update: (task: DownloadTask) => Promise<void>,
): Promise<void> {
  await Promise.all([
    useTaskStore.getState().fetchTasks(),
    taskItemApi(gid).then(update),
  ]);
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTaskIds: [],
  fetchType: TASK_STATUS_ENUM.Active,
  keyword: "",
  deletingTaskIds: [],
  enableNotify: true,
  get selectedTasks() {
    const { tasks, selectedTaskIds } = get();
    return tasks.filter((task) => selectedTaskIds.includes(task.gid));
  },
  async fetchTasks() {
    const { fetchType, keyword } = get();

    let tasks: Array<DownloadTask> = [];
    switch (fetchType) {
      case TASK_STATUS_ENUM.Active:
        tasks = await downloadingTasksApi().then((res) => res?.flat(2));
        break;

      case TASK_STATUS_ENUM.Waiting:
        tasks = await waitingTasksApi();
        break;

      case TASK_STATUS_ENUM.Done:
        tasks = (await stoppedTasksApi()).filter(
          (task) => task.status !== TASK_STATUS_ENUM.Error,
        );
        break;
      case TASK_STATUS_ENUM.Error:
        tasks = (await stoppedTasksApi()).filter(
          (task) => task.status === TASK_STATUS_ENUM.Error,
        );
        break;
    }

    // Filter tasks by keyword if provided (case insensitive search)
    if (keyword && keyword.trim() !== "") {
      const normalizedKeyword = keyword.toLowerCase();
      tasks = tasks.filter((task) => {
        const taskName = getTaskName(task).toLowerCase();
        return taskName.includes(normalizedKeyword);
      });
    }

    if (get().fetchType !== fetchType || get().keyword !== keyword) return;
    const previous = new Map(get().tasks.map((task) => [task.gid, task]));
    tasks = tasks.map((task) => {
      const current = previous.get(task.gid);
      return current && (current.revision ?? 0) > (task.revision ?? 0)
        ? current
        : task;
    });
    set({ tasks });
  },
  async fetchItem(plat_id) {
    // only aria2c
    const newTask = await taskItemApi(plat_id);
    set({ tasks: get().tasks.map((t) => (t.gid === plat_id ? newTask : t)) });
  },
  async addTask(url, option) {
    await addTaskApi(url, compactUndefined(option));
    await get().fetchTasks();
  },
  handleTaskSelect(taskId) {
    const { tasks, selectedTaskIds } = get();
    if (taskId) {
      set({ selectedTaskIds: arrayAddOrRemove(selectedTaskIds, taskId) });
    } else if (tasks.length > 0) {
      const isAllAlready = tasks.length === selectedTaskIds.length;
      set({
        selectedTaskIds: isAllAlready ? [] : tasks.map((item) => item.gid),
      });
    }
  },
  async setFetchType(type: TASK_STATUS_ENUM) {
    set({ fetchType: type, selectedTaskIds: [] });
    await get().fetchTasks();
  },
  setKeyword(keyword) {
    set({ keyword: keyword?.trim() ?? "" });
    get().fetchTasks();
  },
  async handleTaskPause(taskId) {
    if (
      (taskId ? [taskId] : get().selectedTaskIds).some((id) =>
        get().deletingTaskIds.includes(id),
      )
    )
      return;
    if (taskId) {
      await pauseTaskApi(taskId);
    } else {
      const { selectedTaskIds } = get();
      await batchPauseTaskApi(selectedTaskIds);
    }
    await get().fetchTasks();
  },
  async handleTaskResume(taskId) {
    if (
      (taskId ? [taskId] : get().selectedTaskIds).some((id) =>
        get().deletingTaskIds.includes(id),
      )
    )
      return;
    if (
      taskId &&
      get().getTaskByGid(taskId).status === TASK_STATUS_ENUM.Error
    ) {
      try {
        await retryTaskApi(taskId);
        set({
          selectedTaskIds: get().selectedTaskIds.filter((id) => id !== taskId),
        });
      } catch (error) {
        Notice.error(String(error));
      } finally {
        await get().fetchTasks();
      }
      return;
    }
    if (taskId) {
      await resumeTaskApi(taskId);
    } else {
      const { selectedTaskIds } = get();
      await batchResumeTaskApi(selectedTaskIds);
    }
    await get().fetchTasks();
  },
  async handleTaskDelete(taskId) {
    const requested = new Set(taskId ? [taskId] : get().selectedTaskIds);
    const tasks = get().tasks.filter((task) => requested.has(task.gid));
    const taskIds = tasks.map((task) => task.gid);
    if (
      !taskIds.length ||
      taskIds.some((id) => get().deletingTaskIds.includes(id))
    )
      return;
    set({ deletingTaskIds: [...get().deletingTaskIds, ...taskIds] });
    let pendingToken: string | null = null;
    let executed = false;
    const applyReport = (report: TaskDeletionReport) => {
      const removed = new Set(
        report.tasks
          .filter((result) => result.removed)
          .map(({ task }) =>
            task.engine === "vortex" ? `vortex:${task.id}` : task.id,
          ),
      );
      set({
        tasks: get().tasks.filter((task) => !removed.has(task.gid)),
        selectedTaskIds: get().selectedTaskIds.filter((id) => !removed.has(id)),
      });
      if (report.sessionError)
        Notice.error(
          t("task.DeleteSessionError", { reason: report.sessionError }),
        );
    };
    try {
      const decision = await showDialog({
        title: t("task.Delete"),
        message:
          (tasks.length === 1
            ? t("task.ConfirmDelete", { taskName: getTaskName(tasks[0]) })
            : t("task.ConfirmDeleteBatch", { tasksLength: tasks.length })) +
          "\n\n" +
          t("task.DeleteFilesHint"),
        details:
          tasks.length > 1 ? tasks.map((task) => getTaskName(task)) : undefined,
        checkboxLabel: t("task.DeleteFiles"),
        cancelLabel: t("common.Cancel"),
        actions: [
          {
            id: "remove",
            label: t("task.RemoveOnly"),
            checkedLabel: t("task.RemoveAndDelete"),
            danger: true,
          },
        ],
      });
      if (!decision.action) return;
      executed = true;
      let report = await deleteTasks(
        tasks.map((task) => task.ref ?? taskRef(task.gid)),
        decision.checked,
      );
      applyReport(report);
      pendingToken = report.retryToken;
      if (pendingToken) {
        const fallback = await showDialog({
          title: t("task.PermanentDeleteTitle"),
          message: t("task.PermanentDeleteMessage"),
          details: report.tasks.flatMap((result) =>
            result.files.map(
              (file) =>
                `${file.path}\n${t(`task.DeleteFileOutcome_${file.outcome}`)}${file.error ? `: ${file.error}` : ""}`,
            ),
          ),
          cancelLabel: t("common.Cancel"),
          actions: [
            { id: "delete", label: t("task.PermanentDelete"), danger: true },
          ],
        });
        const resolved = await resolveTaskDeletion(
          pendingToken,
          fallback.action === "delete" ? "delete_permanently" : "cancel",
        );
        pendingToken = null;
        report = resolved;
        applyReport(report);
      }
      const failed = report.tasks.filter((result) => !result.removed);
      if (failed.length)
        Notice.error(
          t("task.DeleteFailed", { count: failed.length }) +
            "\n" +
            failed
              .map(
                (result) =>
                  `${result.task.id}: ${t(`task.DeleteStage_${result.stage ?? "files"}`)}: ${
                    result.error ??
                    result.files
                      .filter((file) => file.error)
                      .map((file) => `${file.path}: ${file.error}`)
                      .join("; ")
                  }`,
              )
              .join("\n"),
        );
    } catch (error) {
      Notice.error(String(error));
    } finally {
      if (pendingToken)
        await resolveTaskDeletion(pendingToken, "cancel").catch(
          (error: unknown) => Notice.error(String(error)),
        );
      if (executed)
        await get()
          .fetchTasks()
          .catch((error: unknown) => Notice.error(String(error)));
      set({
        deletingTaskIds: get().deletingTaskIds.filter(
          (id) => !requested.has(id),
        ),
      });
    }
  },
  async openTaskFile(taskId) {
    const task = get().getTaskByGid(taskId);
    const path = await getTaskFullPath(task);

    await revealItemInDir(path).catch((e) => Notice.error(e));
  },
  async copyTaskLink(taskId) {
    const task = get().getTaskByGid(taskId);
    const link = await getTaskUri(task);
    await writeText(link);
  },
  getTaskByGid(gid) {
    const { tasks } = get();
    const task = tasks.find((task) => task.gid === gid);
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  },
  async onDownloadStart([{ gid }]) {
    usePollingStore.getState().resetInterval();
    await refreshAria2Task(gid, async (task) => {
      const taskName = getTaskName(task, "unknown_start", 64);
      if (get().enableNotify) {
        Notice.success(t("task.StartMessage", { taskName }));
      }
      await get().syncToDownloadHistory(task);
    });
  },
  async onDownloadPause([{ gid }]) {
    await refreshAria2Task(gid, (task) => get().syncToDownloadHistory(task));
  },
  async onDownloadStop([{ gid }]) {
    await refreshAria2Task(gid, async (task) => {
      const taskName = getTaskName(task, "unknown_stop", 64);
      if (get().enableNotify) {
        Notice.success(t("task.StopMessage", { taskName }));
      }
      await get().syncToDownloadHistory(task);
    });
  },
  async onDownloadComplete([{ gid }]) {
    await refreshAria2Task(gid, async (task) => {
      if (
        get().enableNotify &&
        !checkTaskIsBT(task) &&
        !task.followedBy?.length
      ) {
        sendNotification({
          title: getTaskName(task, "unknown_complete", 64),
          body: t("common.Complete"),
        });
      }
      await get().syncToDownloadHistory(task);
    });
  },
  async onBtDownloadComplete([{ gid }]) {
    await refreshAria2Task(gid, async (task) => {
      if (
        get().enableNotify &&
        !isMagnetTask(task) &&
        !task.followedBy?.length
      ) {
        sendNotification({
          title: getTaskName(task, "unknown_complete", 64),
          body: t("common.Complete"),
        });
      }
      await get().syncToDownloadHistory(task);
    });
  },
  async onDownloadError([{ gid }]) {
    await refreshAria2Task(gid, async (task) => {
      const taskName = getTaskName(task, "unknown_error", 64);
      Notice.error(t("task.DownloadErrorMessage", { taskName }));
      if (get().enableNotify) {
        sendNotification({
          title: taskName,
          body: t("task.DownloadErrorMessage", { taskName }),
        });
      }
      await Promise.all([
        appLog(
          APP_LOG_LEVEL.Error,
          `[Motrix] aria2 onDownloadError, gid: ${gid}`,
        ),
        get().syncToDownloadHistory(task),
      ]);
    });
  },
  async registerEvent() {
    void registerVortexEvents(async (task, previous, initial) => {
      const changed = previous?.status !== task.status;
      if (task.status === TASK_STATUS_ENUM.Recycle) {
        set({ tasks: get().tasks.filter((item) => item.gid !== task.gid) });
        return;
      }
      if (changed || initial) await get().syncToDownloadHistory(task);
      set({
        tasks: get().tasks.map((item) => (item.gid === task.gid ? task : item)),
      });
      if (changed) await get().fetchTasks();
      if (!initial && changed && get().enableNotify) {
        const taskName = getTaskName(task);
        if (task.status === TASK_STATUS_ENUM.Done) {
          await sendNotification({
            title: taskName,
            body: t("common.Complete"),
          });
        } else if (task.status === TASK_STATUS_ENUM.Error) {
          Notice.error(`${taskName}: ${task.errorMessage ?? task.errorCode}`);
          sendNotification({
            title: taskName,
            body: t("task.DownloadErrorMessage", { taskName }),
          });
        }
      }
    }).catch((error) => Notice.error(String(error)));
    const { addListener } = await getAria2();
    for (const { event, callback } of aria2EventListeners) {
      addListener(event, callback);
    }
  },
  syncByMotrix(config) {
    set({
      enableNotify: !!config.task_completed_notify,
    });
  },
  async syncToDownloadHistory(task) {
    const taskName = getTaskName(task, "unknown_history", 64);
    const link = getTaskUri(task);
    const path = await getTaskFullPath(task);

    const ref = task.ref ?? taskRef(task.gid);
    const historyRecord = await findOneHistoryByPlatId(ref.id, ref.engine);

    const historyDto = {
      engine: ref.engine,
      link,
      name: taskName,
      path,
      total_length: Number(task.totalLength),
      plat_id: ref.id,
      status: task.status,
    };

    if (historyRecord) {
      await updateHistoryByPlatId(ref.id, historyDto, ref.engine);
    } else {
      await createHistory(
        historyDto,
        ref.engine === "aria2c" ? { plat_gid: ref.id } : undefined,
      );
    }

    mutate("getDownloadHistory");
  },
}));
