export const enum TASK_STATUS_ENUM {
  Active = "active",
  Waiting = "waiting",
  Pause = "paused",
  Done = "complete",
  Recycle = "removed",
  Error = "error",
}

export const NORMAL_STATUS = [
  TASK_STATUS_ENUM.Active,
  TASK_STATUS_ENUM.Waiting,
  TASK_STATUS_ENUM.Done,
] as const;

export const enum DOWNLOAD_ENGINE {
  Aria2 = "aria2c",
  // more
}
