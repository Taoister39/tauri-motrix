import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { confirm } from "@tauri-apps/plugin-dialog";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { t } from "i18next";
import { mutate } from "swr";
import { create } from "zustand";

import { Notice } from "@/components/Notice";
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
  selectedTaskIds: Array<string>;
  selectedTasks: Array<Aria2Task>;
  fetchTasks: () => void;
  fetchItem: (plat_id: string) => void;
  setFetchType: (type: TASK_STATUS_ENUM) => void;
  handleTaskSelect: (taskId: string) => void;
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
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTaskIds: [],
  fetchType: TASK_STATUS_ENUM.Active,
  get selectedTasks() {
    const { tasks, selectedTaskIds } = get();
    return tasks.filter((task) => selectedTaskIds.includes(task.gid));
  },
  async fetchTasks() {
    const { fetchType } = get();

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
  handleTaskSelect(taskId: string) {
    const { selectedTaskIds } = get();
    set({ selectedTaskIds: arrayAddOrRemove(selectedTaskIds, taskId) });
  },
  async setFetchType(type: TASK_STATUS_ENUM) {
    set({ fetchType: type, selectedTaskIds: [] });
    await get().fetchTasks();
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
    const { getTaskByGid, selectedTaskIds, fetchTasks } = get();

    let result: boolean;
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
    get().fetchTasks();
    usePollingStore.getState().resetInterval();

    const task = await taskItemApi(gid);
    const taskName = getTaskName(task, "unknown_start", 64);

    Notice.success(t("task.StartMessage", { taskName }));

    get().syncToDownloadHistory(task);
  },
  async onDownloadStop([{ gid }]) {
    const task = await taskItemApi(gid);
    const taskName = getTaskName(task, "unknown_stop", 64);
    Notice.success(t("task.StopMessage", { taskName }));
  },
  async onDownloadComplete([{ gid }]) {
    get().fetchTasks();
    const task = await taskItemApi(gid);
    const title = getTaskName(task, "unknown_complete", 64);

    sendNotification({ title, body: t("common.Complete") });

    get().syncToDownloadHistory(task);
  },
  async registerEvent() {
    const { onDownloadComplete, onDownloadStart, onDownloadStop } = get();
    const { addListener } = await getAria2();

    addListener("onDownloadStart", onDownloadStart);
    addListener("onDownloadStop", onDownloadStop);
    addListener("onDownloadComplete", onDownloadComplete);
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
