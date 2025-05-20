import { useRef } from "react";
import { useTranslation } from "react-i18next";

import ExternalControllerDialog from "@/business/setting/ExternalControllerDialog";
import SpeedLimitDialog from "@/business/setting/SpeedLimitDialog";
import TaskManagementDialog from "@/business/setting/TaskManagementDialog";
import { SettingItem, SettingList } from "@/client/setting_compose";
import { DialogRef } from "@/components/BaseDialog";

function Aria2Setting() {
  const { t } = useTranslation();

  const externalRef = useRef<DialogRef>(null);
  const speedLimitRef = useRef<DialogRef>(null);
  const taskManagementRef = useRef<DialogRef>(null);

  return (
    <SettingList title={t("setting.Aria2")}>
      <ExternalControllerDialog ref={externalRef} />
      <SpeedLimitDialog ref={speedLimitRef} />
      <TaskManagementDialog ref={taskManagementRef} />

      <SettingItem
        label={t("setting.External")}
        onClick={() => externalRef.current?.open()}
      />

      <SettingItem
        label={t("setting.SpeedLimit")}
        onClick={() => speedLimitRef.current?.open()}
      />

      <SettingItem
        label={t("setting.TaskManagement")}
        onClick={() => taskManagementRef.current?.open()}
      />
    </SettingList>
  );
}

export default Aria2Setting;
