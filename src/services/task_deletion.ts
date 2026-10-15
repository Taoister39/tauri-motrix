import { invoke } from "@tauri-apps/api/core";

import type { TaskRef } from "@/services/download";

export interface FileDeletionResult {
  path: string;
  outcome: "trashed" | "deleted" | "missing" | "failed";
  error: string | null;
}

export interface TaskDeletionResult {
  task: TaskRef;
  removed: boolean;
  stage: "stop" | "files" | "remove" | null;
  error: string | null;
  files: FileDeletionResult[];
}

export interface TaskDeletionReport {
  tasks: TaskDeletionResult[];
  retryToken: string | null;
  sessionError: string | null;
}

export const deleteTasks = (tasks: TaskRef[], deleteFiles: boolean) =>
  invoke<TaskDeletionReport>("delete_tasks", { tasks, deleteFiles });

export const resolveTaskDeletion = (
  token: string,
  action: "delete_permanently" | "cancel",
) => invoke<TaskDeletionReport>("resolve_task_deletion", { token, action });
