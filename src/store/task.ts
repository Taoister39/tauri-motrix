import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { confirm } from "@tauri-apps/plugin-dialog";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { t } from "i18next";
import { mutate } from "swr";
import { create } from "zustand";

import { Notice } from "@/components/Notice";
import { APP_LOG_LEVEL } from "@/constant/log";
import { DOWNLOAD_ENGINE, TASK_STATUS_ENUM } from "@/constant/task";
import {
  addTaskApi,
  Aria2Task,
  batchForcePauseTaskApi,
  batchPauseTaskApi,
  batchRemoveTaskApi,
  batchResumeTaskApi,
  downloadingTasksApi,
  forcePauseTaskApi,
  getAria2,
  pauseTaskApi,
  removeDownloadResultTaskApi,
  removeTaskApi,
  resumeTaskApi,
  saveSessionApi,
  stoppedTasksApi,
  taskItemApi,
  waitingTasksApi,
} from "@/services/aria2c_api";
import { DownloadOption } from "@/services/aria2c_api";
import { appLog } from "@/services/cmd";
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
  tasks: Array<Aria2Task>;
  fetchType: TASK_STATUS_ENUM;
  keyword: string;
  selectedTaskIds: Array<string>;
  selectedTasks: Array<Aria2Task>;
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
  getTaskByGid: (gid: string) => Aria2Task;
  syncToDownloadHistory: (task: Aria2Task) => void;
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

    let tasks: Array<Aria2Task> = [];
    switch (fetchType) {
      case TASK_STATUS_ENUM.Active:
        tasks = await downloadingTasksApi().then((res) => res?.flat(2));
        break;

      case TASK_STATUS_ENUM.Waiting:
        tasks = await waitingTasksApi();
        break;

      case TASK_STATUS_ENUM.Done:
        tasks = await stoppedTasksApi();
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

    if (!taskId) {
      await batchForcePauseTaskApi(selectedTaskIds);
      await batchRemoveTaskApi(selectedTaskIds);

      set({ selectedTaskIds: [] });
    } else {
      const task = getTaskByGid(taskId);

      if (task.status === TASK_STATUS_ENUM.Active) {
        await forcePauseTaskApi(taskId);
      }

      if (
        [
          TASK_STATUS_ENUM.Error,
          TASK_STATUS_ENUM.Done,
          TASK_STATUS_ENUM.Recycle,
        ].includes(task.status as TASK_STATUS_ENUM)
      ) {
        await removeDownloadResultTaskApi(taskId);
      } else {
        await removeTaskApi(taskId);
      }
    }

    await saveSessionApi();
    await fetchTasks();
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

    get().syncToDownloadHistory(task);
  },
  async registerEvent() {
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

    const historyRecord = await findOneHistoryByPlatId(task.gid);

    const historyDto = {
      engine: DOWNLOAD_ENGINE.Aria2,
      link,
      name: taskName,
      path,
      total_length: Number(task.totalLength),
      plat_id: task.gid,
      status: task.status,
    };

    if (historyRecord) {
      await updateHistoryByPlatId(task.gid, historyDto);
    } else {
      await createHistory(historyDto, {
        plat_gid: task.gid,
      });
    }

    mutate("getDownloadHistory");
  },
}));
