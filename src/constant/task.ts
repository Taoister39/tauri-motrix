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

export const enum PROXY_SCOPES {
  DOWNLOAD = "download",
  UPDATE_APP = "update-app",
  UPDATE_TRACKERS = "update-trackers",
}

export const PROXY_SCOPE_OPTIONS = [
  PROXY_SCOPES.DOWNLOAD,
  PROXY_SCOPES.UPDATE_APP,
  PROXY_SCOPES.UPDATE_TRACKERS,
];
