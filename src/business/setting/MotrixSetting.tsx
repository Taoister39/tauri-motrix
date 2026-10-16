import { MenuItem, Select } from "@mui/material";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { SettingItem, SettingList } from "@/client/setting_compose";
import { Android12Switch } from "@/client/styled_compose";
import { DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { LOG_LEVELS } from "@/constant/log";
import { useMotrix } from "@/hooks/motrix";
import { exitApp, openAppDir, openCoreDir, openLogsDir } from "@/services/cmd";
import { checkForUpdates } from "@/services/updates";

import ListenPortsViewer from "./ListenPortsViewer";

function MotrixSetting() {
  const { motrix, patchMotrix } = useMotrix();
  const { t } = useTranslation();

  const listenPortsRef = useRef<DialogRef>(null);

  return (
    <SettingList title={t("setting.Motrix")}>
      <ListenPortsViewer ref={listenPortsRef} />

      <SettingItem label={t("setting.LogLevelInfo")}>
        <Select
          value={motrix?.app_log_level ?? "info"}
          size="small"
          sx={{ width: 100, "> div": { py: "7.5px" } }}
          onChange={async (e) => {
            await patchMotrix({
              app_log_level: e.target.value as MotrixConfig["app_log_level"],
            });

            Notice.success(t("common.SaveSuccess"));
          }}
        >
          {LOG_LEVELS.map(({ label, value }) => (
            <MenuItem value={value}>{label}</MenuItem>
          ))}
        </Select>
      </SettingItem>

      <SettingItem label={t("setting.NewTaskShowDownloading")}>
        <Android12Switch
          checked={!!motrix?.new_task_show_downloading}
          onChange={(e) => {
            patchMotrix({
              new_task_show_downloading: e.target.checked,
            });
          }}
        />
      </SettingItem>

      <SettingItem label={t("setting.TaskCompletedNotify")}>
        <Android12Switch
          checked={!!motrix?.task_completed_notify}
          onChange={(e) => {
            patchMotrix({
              task_completed_notify: e.target.checked,
            });
          }}
        />
      </SettingItem>

      <SettingItem label={t("setting.AutoCheckUpdate")}>
        <Android12Switch
          checked={!!motrix?.auto_check_update}
          onChange={(e) => {
            patchMotrix({
              auto_check_update: e.target.checked,
            });
          }}
        />
      </SettingItem>

      <SettingItem
        label={t("setting.ListenPorts")}
        onClick={() => listenPortsRef.current?.open()}
      />

      <SettingItem label={t("setting.OpenConfDir")} onClick={openAppDir} />
      <SettingItem label={t("setting.OpenCoreDir")} onClick={openCoreDir} />
      <SettingItem label={t("setting.OpenLogsDir")} onClick={openLogsDir} />
      <SettingItem
        label={t("setting.CheckForUpdates")}
        onClick={checkForUpdates}
      />
      <SettingItem label={t("common.Exit")} onClick={exitApp} />
    </SettingList>
  );
}

export default MotrixSetting;
