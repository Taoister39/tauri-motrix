import { invoke } from "@tauri-apps/api/core";

import { APP_LOG_LEVEL } from "@/constant/log";

export function getAria2Info() {
  return invoke<Aria2Info>("get_aria2_info");
}

export const getAria2Config = () =>
  invoke<Aria2Config | null>("get_aria2_config");

export const getMotrixConfig = () =>
  invoke<MotrixConfig | null>("get_motrix_config");

export const openLogsDir = () => invoke<void>("open_logs_dir");

export const openAppDir = () => invoke<void>("open_app_dir");

export const openCoreDir = () => invoke<void>("open_core_dir");

export const exitApp = () => invoke<void>("exit_app");

export const patchMotrixConfig = (data: Partial<MotrixConfig>) =>
  invoke<null>("patch_motrix_config", { data });

export const patchAria2Config = (data: Partial<Aria2Config>) =>
  invoke<null>("patch_aria2_config", { data });

export const getAutoLaunchStatus = () =>
  invoke<boolean>("get_auto_launch_status");

export const appLog = (
  level: APP_LOG_LEVEL,
  message: string,
  location?: string,
) => invoke<null>("app_log", { level, message, location });

export const stopEngine = () => invoke("stop_engine");
