import { confirm } from "@tauri-apps/plugin-dialog";

import { TASK_STATUS_ENUM } from "@/constant/task";
import {
  Aria2Task,
  batchForcePauseTaskApi,
  batchRemoveTaskApi,
  forcePauseTaskApi,
  removeDownloadResultTaskApi,
  removeTaskApi,
  saveSessionApi,
  stoppedTasksApi,
} from "@/services/aria2c_api";
import { useTaskStore } from "@/store/task";

jest.mock("@tauri-apps/plugin-dialog");
jest.mock("@/services/aria2c_api");

const createTask = (gid: string, status: TASK_STATUS_ENUM): Aria2Task => ({
  gid,
  status,
  completedLength: "0",
  connections: "0",
  dir: "",
  downloadSpeed: "0",
  files: [],
  numPieces: "0",
  pieceLength: "0",
  totalLength: "0",
  uploadLength: "0",
  uploadSpeed: "0",
});

describe("handleTaskDelete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTaskStore.setState(useTaskStore.getInitialState(), true);
    useTaskStore.setState({ skipConfirm: true });
  });

  afterEach(() => {
    useTaskStore.setState(useTaskStore.getInitialState(), true);
  });

  it("deletes selected tasks with mixed statuses and refreshes the list", async () => {
    const selectedTasks = [
      createTask("active", TASK_STATUS_ENUM.Active),
      createTask("waiting", TASK_STATUS_ENUM.Waiting),
      createTask("paused", TASK_STATUS_ENUM.Pause),
      createTask("complete", TASK_STATUS_ENUM.Done),
      createTask("error", TASK_STATUS_ENUM.Error),
      createTask("removed", TASK_STATUS_ENUM.Recycle),
    ];
    const remainingTask = createTask("unselected", TASK_STATUS_ENUM.Done);
    useTaskStore.setState({
      tasks: [...selectedTasks, remainingTask],
      selectedTaskIds: selectedTasks.map((task) => task.gid),
      fetchType: TASK_STATUS_ENUM.Done,
    });
    jest.mocked(stoppedTasksApi).mockResolvedValue([remainingTask]);

    await useTaskStore.getState().handleTaskDelete();

    expect(jest.mocked(forcePauseTaskApi).mock.calls).toEqual([["active"]]);
    expect(
      jest
        .mocked(removeTaskApi)
        .mock.calls.map(([gid]) => gid)
        .sort(),
    ).toEqual(["active", "paused", "waiting"]);
    expect(jest.mocked(removeDownloadResultTaskApi).mock.calls).toEqual([
      ["complete"],
      ["error"],
      ["removed"],
    ]);
    expect(saveSessionApi).toHaveBeenCalledTimes(1);
    expect(useTaskStore.getState().tasks).toEqual([
      expect.objectContaining(remainingTask),
    ]);
    expect(useTaskStore.getState().selectedTaskIds).toEqual([]);
  });

  it("deletes only the requested task when a task ID is provided", async () => {
    const task = createTask("complete", TASK_STATUS_ENUM.Done);
    const remainingTask = createTask("unselected", TASK_STATUS_ENUM.Done);
    useTaskStore.setState({
      tasks: [task, remainingTask],
      selectedTaskIds: [remainingTask.gid],
      fetchType: TASK_STATUS_ENUM.Done,
    });
    jest.mocked(stoppedTasksApi).mockResolvedValue([remainingTask]);

    await useTaskStore.getState().handleTaskDelete(task.gid);

    expect(jest.mocked(removeDownloadResultTaskApi).mock.calls).toEqual([
      [task.gid],
    ]);
    expect(forcePauseTaskApi).not.toHaveBeenCalled();
    expect(removeTaskApi).not.toHaveBeenCalled();
    expect(saveSessionApi).toHaveBeenCalledTimes(1);
    expect(useTaskStore.getState().tasks).toEqual([
      expect.objectContaining(remainingTask),
    ]);
  });

  it("keeps the tasks and selection when batch deletion is cancelled", async () => {
    const task = createTask("complete", TASK_STATUS_ENUM.Done);
    useTaskStore.setState({
      tasks: [task],
      selectedTaskIds: [task.gid],
      skipConfirm: false,
    });
    jest.mocked(confirm).mockResolvedValue(false);

    await useTaskStore.getState().handleTaskDelete();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(batchForcePauseTaskApi).not.toHaveBeenCalled();
    expect(batchRemoveTaskApi).not.toHaveBeenCalled();
    expect(forcePauseTaskApi).not.toHaveBeenCalled();
    expect(removeTaskApi).not.toHaveBeenCalled();
    expect(removeDownloadResultTaskApi).not.toHaveBeenCalled();
    expect(saveSessionApi).not.toHaveBeenCalled();
    expect(useTaskStore.getState().tasks).toEqual([task]);
    expect(useTaskStore.getState().selectedTaskIds).toEqual([task.gid]);
  });
});
