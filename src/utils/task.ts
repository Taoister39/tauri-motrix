import { LinearProgressProps } from "@mui/material";
import { resolve } from "@tauri-apps/api/path";

import { TASK_STATUS_ENUM } from "@/constant/task";
import { Aria2Task } from "@/services/aria2c_api";
// code from Motrix repo

export const getTaskName = (
  task: Aria2Task | undefined | null,
  defaultName = "",
  maxLen?: number,
) => {
  let result = defaultName;
  if (!task) {
    return result;
  }

  const { files, bittorrent } = task;
  const total = files.length;

  if (bittorrent && bittorrent.info && bittorrent.info.name) {
    const { name } = bittorrent.info;
    result = maxLen ? ellipsis(name, maxLen) : name;
  } else if (total === 1) {
    result = getFileNameFromFile(files[0]);

    if (maxLen) {
      result = ellipsis(result, maxLen);
    }
  }

  return result;
};

export const ellipsis = (str = "", maxLen = 64) => {
  const len = str.length;
  let result = str;
  if (len < maxLen) {
    return result;
  }

  if (maxLen > 0) {
    result = `${result.substring(0, maxLen)}...`;
  }

  return result;
};

export const getFileNameFromFile = (file: Aria2Task["files"][number]) => {
  if (!file) {
    return "";
  }

  let { path } = file;
  if (!path && file.uris && file.uris.length > 0) {
    path = decodeURI(file.uris[0].uri);
  }

  const index = typeof path === "undefined" ? -1 : path.lastIndexOf("/");

  if (index <= 0 || index === path.length) {
    return path;
  }

  return path.substring(index + 1);
};

export const timeRemaining = (
  totalLength: number,
  completedLength: number,
  downloadSpeed: number,
) => {
  const remainingLength = totalLength - completedLength;
  return Math.ceil(remainingLength / downloadSpeed);
};

interface TimeFormatI18 {
  gt1d?: string;
  hour?: string;
  minute?: string;
  second?: string;
}

export const timeFormat = (
  seconds: number,
  prefix = "",
  suffix = "",
  i18?: TimeFormatI18,
) => {
  let result = "";
  let hours = "";
  let minutes = "";
  let secs = seconds || 0;
  const i = {
    gt1d: "> 1 day",
    hour: "h",
    minute: "m",
    second: "s",
    ...i18,
  };

  if (secs <= 0) {
    return "";
  }
  if (secs > 86400) {
    return `${prefix} ${i.gt1d} ${suffix}`;
  }
  if (secs > 3600) {
    hours = `${Math.floor(secs / 3600)}${i.hour} `;
    secs %= 3600;
  }
  if (secs > 60) {
    minutes = `${Math.floor(secs / 60)}${i.minute} `;
    secs %= 60;
  }
  const secsSuffix = secs + i.second;
  result = hours + minutes + secsSuffix;
  return result ? `${prefix} ${result} ${suffix}` : result;
};

export const getTaskFullPath = async (task: Aria2Task) => {
  const { dir, files, bittorrent } = task;
  let result = await resolve(dir);

  // Magnet link task
  if (isMagnetTask(task)) {
    return result;
  }

  if (bittorrent && bittorrent.info && bittorrent.info.name) {
    result = await resolve(result, bittorrent.info.name);
    return result;
  }

  const [file] = files;
  const path = file.path ? await resolve(file.path) : "";
  let fileName = "";

  if (path) {
    result = path;
  } else {
    if (files && files.length === 1) {
      fileName = getFileNameFromFile(file);
      if (fileName) {
        result = await resolve(result, fileName);
      }
    }
  }

  return result;
};

export const isMagnetTask = (task: Aria2Task) => {
  const { bittorrent } = task;
  return !!bittorrent && !bittorrent.info;
};

export const getTaskUri = (task: Aria2Task, withTracker = false) => {
  const { files } = task;
  let result = "";
  if (checkTaskIsBT(task)) {
    result = buildMagnetLink(task, withTracker);
    return result;
  }

  if (files && files.length === 1) {
    const { uris } = files[0];
    result = uris[0].uri;
  }

  return result;
};

export const checkTaskIsBT = (task: Aria2Task) => {
  const { bittorrent } = task;
  return !!bittorrent;
};

export const buildMagnetLink = (
  task: Aria2Task,
  withTracker = false,
  btTracker: string[] = [],
) => {
  const { bittorrent, infoHash } = task;
  if (!bittorrent) {
    throw new Error("bittorrent is undefined");
  }

  const { info } = bittorrent;

  const params = [`magnet:?xt=urn:btih:${infoHash}`];
  if (info && info.name) {
    params.push(`dn=${encodeURI(info.name)}`);
  }

  if (withTracker) {
    const trackers = bittorrent.announceList.filter(
      (tracker) => !btTracker.includes(tracker),
    );
    trackers.forEach((tracker) => {
      params.push(`tr=${encodeURI(tracker)}`);
    });
  }

  const result = params.join("&");

  return result;
};

export const getTaskProgressColor = (
  progress: number,
  status: string,
): LinearProgressProps["color"] => {
  if (progress === 100) {
    return "success";
  }

  switch (status) {
    case TASK_STATUS_ENUM.Pause:
      return "secondary";
    case TASK_STATUS_ENUM.Error:
      return "error";
    default:
      return "primary";
  }
};
