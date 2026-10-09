import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { confirm } from "@tauri-apps/plugin-dialog";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { t } from "i18next";
import { mutate } from "swr";
import { create } from "zustand";

import { Notice } from "@/components/Notice";
import { APP_LOG_LEVEL } from "@/constant/log";
import { TASK_STATUS_ENUM } from "@/constant/task";
import { appLog } from "@/services/cmd";
import {
  addTaskApi,
  batchPauseTaskApi,
  batchResumeTaskApi,
  downloadingTasksApi,
  DownloadTask,
  forcePauseTaskApi,
  getAria2,
  pauseTaskApi,
  registerVortexEvents,
  removeDownloadResultTaskApi,
  removeTaskApi,
  resumeTaskApi,
  retryTaskApi,
  saveSessionApi,
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
import { usePollingStore } from "@/store/polling";
import { arrayAddOrRemove } from "@/utils/array_add_or_remove";
import { compactUndefined } from "@/utils/compact_undefined";
import { getTaskFullPath, getTaskName, getTaskUri } from "@/utils/task";

export type WrapGid = [{ gid: string }];

interface TaskStore {
  tasks: Array<DownloadTask>;
  fetchType: TASK_STATUS_ENUM;
  keyword: string;
  selectedTaskIds: Array<string>;
  selectedTasks: Array<DownloadTask>;
  skipConfirm: boolean;
  enableNotify: boolean;
  syncByMotrix: (config: Partial<MotrixConfig>) => void;
  fetchTasks: () => void;
  fetchItem: (plat_id: string) => void;
  setFetchType: (type: TASK_STATUS_ENUM) => void;
  setKeyword: (keyword?: string) => void;
  handleTaskSelect: (taskId?: string) => void;
  handleTaskPause: (taskId?: string) => void;
  handleTaskResume: (taskId?: string) => void;
  handleTaskDelete: (taskId?: string) => void;
  openTaskFile: (taskId: string) => void;
  copyTaskLink: (taskId: string) => void;
  addTask: (url: string, option: DownloadOption) => void;
  getTaskByGid: (gid: string) => DownloadTask;
  syncToDownloadHistory: (task: DownloadTask) => Promise<void>;
  registerEvent: () => void;
  onDownloadStart: (wrap: WrapGid) => void;
  onDownloadStop: (wrap: WrapGid) => void;
  onDownloadComplete: (wrap: WrapGid) => void;
  onDownloadError: (wrap: WrapGid) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTaskIds: [],
  fetchType: TASK_STATUS_ENUM.Active,
  keyword: "",
  skipConfirm: false,
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
  // TODO: to be renovated
  async handleTaskDelete(taskId) {
    const { getTaskByGid, selectedTaskIds, fetchTasks, skipConfirm } = get();

    let result = skipConfirm;

    if (!result) {
      if (!taskId) {
        result = await confirm(
          t("task.ConfirmDeleteBatch", {
            tasksLength: selectedTaskIds.length,
            title: t("task.Delete"),
            kind: "warning",
          }),
        );
      } else {
        const task = getTaskByGid(taskId);
        const taskName = getTaskName(task, "unknown", 16);

        result = await confirm(t("task.ConfirmDelete", { taskName }), {
          title: t("task.Delete"),
          kind: "warning",
        });
      }
    }

    if (!result) {
      return;
    }

    const taskIds = taskId ? [taskId] : selectedTaskIds;
    const results = await Promise.allSettled(
      taskIds.map(async (gid) => {
        const task = getTaskByGid(gid);

        if (task.status === TASK_STATUS_ENUM.Active) {
          await forcePauseTaskApi(gid);
        }

        if (
          [
            TASK_STATUS_ENUM.Error,
            TASK_STATUS_ENUM.Done,
            TASK_STATUS_ENUM.Recycle,
          ].includes(task.status as TASK_STATUS_ENUM)
        ) {
          await removeDownloadResultTaskApi(gid);
        } else {
          await removeTaskApi(gid);
        }
      }),
    );

    if (!taskId) {
      set({ selectedTaskIds: [] });
    }

    try {
      if (taskIds.some((id) => taskRef(id).engine === "aria2c"))
        await saveSessionApi();
    } finally {
      await fetchTasks();
    }
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length)
      Notice.error(failed.map((result) => String(result.reason)).join("; "));
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
    const { fetchTasks, enableNotify } = get();
    fetchTasks();
    usePollingStore.getState().resetInterval();

    const task = await taskItemApi(gid);
    const taskName = getTaskName(task, "unknown_start", 64);

    if (enableNotify) {
      Notice.success(t("task.StartMessage", { taskName }));
    }

    get().syncToDownloadHistory(task);
  },
  async onDownloadStop([{ gid }]) {
    const task = await taskItemApi(gid);
    const taskName = getTaskName(task, "unknown_stop", 64);
    if (get().enableNotify) {
      Notice.success(t("task.StopMessage", { taskName }));
    }
  },
  async onDownloadComplete([{ gid }]) {
    get().fetchTasks();
    const task = await taskItemApi(gid);
    const title = getTaskName(task, "unknown_complete", 64);

    if (get().enableNotify) {
      sendNotification({ title, body: t("common.Complete") });
    }
    get().syncToDownloadHistory(task);
  },
  async onDownloadError([{ gid }]) {
    const task = await taskItemApi(gid);
    const { errorCode, errorMessage } = task;
    const taskName = getTaskName(task, "unknown_error", 64);

    appLog(
      APP_LOG_LEVEL.Error,
      `[Motrix] download error gid: ${gid}, #${errorCode}, ${errorMessage}`,
    );

    Notice.error(t("task.DownloadErrorMessage", { taskName }));

    if (get().enableNotify) {
      sendNotification({
        title: taskName,
        body: t("task.DownloadErrorMessage", { taskName }),
      });
    }

    await Promise.all([get().syncToDownloadHistory(task), get().fetchTasks()]);
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
    const {
      onDownloadComplete,
      onDownloadStart,
      onDownloadStop,
      onDownloadError,
    } = get();
    const { addListener } = await getAria2();

    addListener("onDownloadStart", onDownloadStart);
    addListener("onDownloadStop", onDownloadStop);
    addListener("onDownloadError", onDownloadError);
    addListener("onDownloadComplete", onDownloadComplete);
  },
  syncByMotrix(config) {
    set({
      skipConfirm: !!config.no_confirm_before_delete_task,
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
