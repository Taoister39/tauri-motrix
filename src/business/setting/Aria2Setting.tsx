import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import HistoryPathInput from "@/business/history/HistoryPathInput";
import ExternalControllerDialog from "@/business/setting/ExternalControllerDialog";
import SpeedLimitDialog from "@/business/setting/SpeedLimitDialog";
import TaskManagementDialog from "@/business/setting/TaskManagementDialog";
import { SettingItem, SettingList } from "@/client/setting_compose";
import { Android12Switch } from "@/client/styled_compose";
import { DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { DOWNLOAD_ENGINE } from "@/constant/task";
import { useAria2 } from "@/hooks/aria2";
import { addOneDir, findOneDirByPath } from "@/services/save_to_history";

import BtTrackerDialog from "./BtTrackerDialog";

function Aria2Setting() {
  const { t } = useTranslation();

  const externalRef = useRef<DialogRef>(null);
  const speedLimitRef = useRef<DialogRef>(null);
  const taskManagementRef = useRef<DialogRef>(null);
  const btTrackerRef = useRef<DialogRef>(null);

  const { aria2, patchAria2 } = useAria2();

  const isTrue = useCallback(
    (key: keyof NonNullable<typeof aria2>) => aria2?.[key] === "true",
    [aria2],
  );

  const btAutoDownloadContent =
    isTrue("follow-torrent") &&
    isTrue("follow-metalink") &&
    !isTrue("pause-metadata");

  const [dir, setDir] = useState(aria2?.dir || "");

  useEffect(() => {
    if (aria2?.dir) {
      setDir(aria2.dir);
    }
  }, [aria2]);

  const handleDir = async (newPath: string) => {
    await patchAria2({ dir: newPath });

    const dirRecord = await findOneDirByPath(dir);

    if (!dirRecord && dir) {
      await addOneDir({
        dir,
        engine: DOWNLOAD_ENGINE.Aria2,
      });
      mutate("getSaveToHistory");
    }
    Notice.success(t("common.SaveSuccess"));
  };

  return (
    <SettingList title={t("setting.Aria2")}>
      <ExternalControllerDialog ref={externalRef} />
      <SpeedLimitDialog ref={speedLimitRef} />
      <TaskManagementDialog ref={taskManagementRef} />
      <BtTrackerDialog ref={btTrackerRef} />

      <SettingItem
        label={t("setting.External")}
        onClick={() => externalRef.current?.open()}
      />

      <SettingItem
        label={t("setting.SpeedLimit")}
        onClick={() => speedLimitRef.current?.open()}
      />

      <SettingItem
        label={t("setting.BtTracker")}
        onClick={() => btTrackerRef.current?.open()}
      />

      <SettingItem
        label={t("common.More")}
        onClick={() => taskManagementRef.current?.open()}
      />

      <SettingItem label={t("setting.DefaultPath")}>
        <HistoryPathInput
          value={dir}
          setValue={handleDir}
          onChange={(e) => setDir(e.target.value)}
          sx={{ ml: 2 }}
        />
      </SettingItem>

      <SettingItem label={t("setting.BtSaveMetadata")}>
        <Android12Switch
          checked={isTrue("bt-save-metadata")}
          onChange={(e) => {
            const checked = e.target.checked;
            patchAria2({ "bt-save-metadata": JSON.stringify(checked) });
          }}
        />
      </SettingItem>

      <SettingItem label={t("setting.BtAutoDownloadContent")}>
        <Android12Switch
          checked={btAutoDownloadContent}
          onChange={(e) => {
            const checked = e.target.checked;
            patchAria2({
              "follow-torrent": JSON.stringify(checked),
              "follow-metalink": JSON.stringify(checked),
              "pause-metadata": JSON.stringify(!checked),
            });
          }}
        />
      </SettingItem>

      <SettingItem label={t("setting.BtForceEncryption")}>
        <Android12Switch
          checked={isTrue("bt-force-encryption")}
          onChange={(e) => {
            const checked = e.target.checked;
            patchAria2({ "bt-force-encryption": JSON.stringify(checked) });
          }}
        />
      </SettingItem>

      <SettingItem label={t("setting.Continue")}>
        <Android12Switch
          checked={isTrue("continue")}
          onChange={(e) => {
            const checked = e.target.checked;
            patchAria2({ continue: JSON.stringify(checked) });
          }}
        />
      </SettingItem>
    </SettingList>
  );
}

export default Aria2Setting;
