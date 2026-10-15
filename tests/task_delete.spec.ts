import { Notice } from "@/components/Notice";
import { DOWNLOAD_ENGINE } from "@/constant/task";
import { showDialog } from "@/services/dialog";
import {
  type DownloadTask,
  fromVortex,
  pauseTaskApi,
  resumeTaskApi,
} from "@/services/download";
import {
  deleteTasks,
  resolveTaskDeletion,
  type TaskDeletionReport,
} from "@/services/task_deletion";
import { useTaskStore } from "@/store/task";

jest.mock("@/components/Notice", () => ({ Notice: { error: jest.fn() } }));
jest.mock("@/services/dialog", () => ({ showDialog: jest.fn() }));
jest.mock("@/services/task_deletion", () => ({
  deleteTasks: jest.fn(),
  resolveTaskDeletion: jest.fn(),
}));
jest.mock("@/services/download", () => ({
  ...jest.requireActual("@/services/download"),
  pauseTaskApi: jest.fn(),
  resumeTaskApi: jest.fn(),
}));
jest.mock("@/services/aria2c_api", () => ({}));
jest.mock("i18next", () => ({ t: (key: string) => key }));

const vortex = fromVortex({
  id: "native",
  revision: 1,
  state: "paused",
  url: "https://example.test/file",
  path: "C:/Downloads/native",
  total: 10,
  completed: 0,
  speed: 0,
  connections: 0,
  error: null,
});
const aria: DownloadTask = {
  ...vortex,
  gid: "aria",
  ref: { engine: DOWNLOAD_ENGINE.Aria2, id: "aria" },
};
const fetchTasks = jest.fn().mockResolvedValue(undefined);
const dialogs = jest.mocked(showDialog);
const remove = jest.mocked(deleteTasks);
const resolve = jest.mocked(resolveTaskDeletion);

function report(removed = true): TaskDeletionReport {
  return {
    tasks: [aria, vortex].map((task) => ({
      task: task.ref!,
      removed,
      stage: removed ? null : "files",
      error: null,
      files: [],
    })),
    retryToken: null,
    sessionError: null,
  };
}

describe("Task deletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTaskStore.setState({
      tasks: [aria, vortex],
      selectedTaskIds: [aria.gid, vortex.gid],
      deletingTaskIds: [],
      fetchTasks,
    });
  });

  it("cancellation leaves tasks and files untouched even with the old skip setting enabled", async () => {
    useTaskStore
      .getState()
      .syncByMotrix({ no_confirm_before_delete_task: true });
    dialogs.mockResolvedValueOnce({ action: null, checked: false });
    await useTaskStore.getState().handleTaskDelete(aria.gid);
    expect(remove).not.toHaveBeenCalled();
    expect(useTaskStore.getState().selectedTaskIds).toEqual([
      aria.gid,
      vortex.gid,
    ]);
    expect(useTaskStore.getState().deletingTaskIds).toEqual([]);
  });

  it("passes engine-qualified task identities and preserves the default file choice", async () => {
    dialogs.mockResolvedValueOnce({ action: "remove", checked: false });
    remove.mockResolvedValueOnce(report());
    await useTaskStore.getState().handleTaskDelete();
    expect(remove).toHaveBeenCalledWith([aria.ref, vortex.ref], false);
    expect(useTaskStore.getState().selectedTaskIds).toEqual([]);
    expect(fetchTasks).toHaveBeenCalledTimes(1);
  });

  it("removes only the requested task and retains unrelated selections", async () => {
    dialogs.mockResolvedValueOnce({ action: "remove", checked: false });
    const single = report();
    single.tasks = [single.tasks[0]];
    remove.mockResolvedValueOnce(single);
    useTaskStore.setState({ selectedTaskIds: [vortex.gid] });
    await useTaskStore.getState().handleTaskDelete(aria.gid);
    expect(remove).toHaveBeenCalledWith([aria.ref], false);
    expect(useTaskStore.getState().tasks).toEqual([vortex]);
    expect(useTaskStore.getState().selectedTaskIds).toEqual([vortex.gid]);
  });

  it("only clears successful selections and cancels the permanent deletion fallback", async () => {
    dialogs
      .mockResolvedValueOnce({ action: "remove", checked: true })
      .mockResolvedValueOnce({ action: null, checked: false });
    const partial = report();
    partial.tasks[1] = {
      ...partial.tasks[1],
      removed: false,
      stage: "files",
      files: [
        {
          path: "C:/Downloads/native",
          outcome: "failed",
          error: "Recycle unavailable",
        },
      ],
    };
    remove.mockResolvedValueOnce({ ...partial, retryToken: "token" });
    resolve.mockResolvedValueOnce(partial);
    await useTaskStore.getState().handleTaskDelete();
    expect(resolve).toHaveBeenCalledWith("token", "cancel");
    expect(dialogs.mock.calls[1][0].checkboxLabel).toBeUndefined();
    expect(useTaskStore.getState().selectedTaskIds).toEqual([vortex.gid]);
    expect(Notice.error).toHaveBeenCalled();
  });

  it("requires a second affirmative decision before permanent deletion", async () => {
    dialogs
      .mockResolvedValueOnce({ action: "remove", checked: true })
      .mockResolvedValueOnce({ action: "delete", checked: false });
    remove.mockResolvedValueOnce({ ...report(false), retryToken: "token" });
    resolve.mockResolvedValueOnce(report());
    await useTaskStore.getState().handleTaskDelete();
    expect(resolve).toHaveBeenCalledWith("token", "delete_permanently");
    expect(useTaskStore.getState().deletingTaskIds).toEqual([]);
  });

  it("prevents duplicate deletion and conflicting task controls while awaiting a decision", async () => {
    let decide!: (value: { action: null; checked: boolean }) => void;
    dialogs.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          decide = resolve;
        }),
    );
    const pending = useTaskStore.getState().handleTaskDelete(aria.gid);
    await useTaskStore.getState().handleTaskDelete(aria.gid);
    await useTaskStore.getState().handleTaskResume(aria.gid);
    await useTaskStore.getState().handleTaskPause(aria.gid);
    expect(dialogs).toHaveBeenCalledTimes(1);
    expect(resumeTaskApi).not.toHaveBeenCalled();
    expect(pauseTaskApi).not.toHaveBeenCalled();
    decide({ action: null, checked: false });
    await pending;
    expect(useTaskStore.getState().deletingTaskIds).toEqual([]);
  });

  it("releases pending state and refreshes after an IPC failure", async () => {
    dialogs.mockResolvedValueOnce({ action: "remove", checked: true });
    remove.mockRejectedValueOnce(new Error("Engine unavailable"));
    await useTaskStore.getState().handleTaskDelete(aria.gid);
    expect(useTaskStore.getState().deletingTaskIds).toEqual([]);
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(Notice.error).toHaveBeenCalledWith("Error: Engine unavailable");
  });
});
