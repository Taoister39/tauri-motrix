import { MenuItem, Select } from "@mui/material";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import ThemeModeSwitch from "@/business/setting/ThemeModeSwitch";
import { SettingItem, SettingList } from "@/client/setting_compose";
import { Android12Switch } from "@/client/styled_compose";
import { AVAILABLE_LANGUAGES } from "@/constant/language";
import { useMotrix } from "@/hooks/motrix";
import { getAutoLaunchStatus } from "@/services/cmd";
import { getLanguage } from "@/services/i18n";

function AppearanceSetting() {
  const { t, i18n } = useTranslation();
  const { motrix, patchMotrix, mutateMotrix } = useMotrix();

  const { data: autoLaunchEnabled, mutate: mutateAutoLaunchEnabled } = useSWR(
    "getAutoLaunchStatus",
    getAutoLaunchStatus,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    // Subject to autoLaunchEnabled
    if (
      autoLaunchEnabled !== undefined &&
      motrix &&
      motrix?.app_hide_window !== autoLaunchEnabled
    ) {
      mutateMotrix({ ...motrix, enable_auto_launch: autoLaunchEnabled }, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLaunchEnabled]);

  return (
    <SettingList title={t("setting.Display")}>
      <SettingItem label={t("setting.ThemeMode")}>
        <ThemeModeSwitch />
      </SettingItem>

      <SettingItem label={t("setting.AutoLaunch")}>
        <Android12Switch
          checked={!!motrix?.enable_auto_launch}
          onChange={async (e) => {
            await patchMotrix({ enable_auto_launch: e.target.checked });
            await mutateAutoLaunchEnabled();
          }}
        />
      </SettingItem>

      <SettingItem
        label={t("setting.AutoResumeAll")}
        secondary={t("setting.AutoResumeAllDescription")}
      >
        <Android12Switch
          checked={!!motrix?.auto_resume_all}
          onChange={async (e) => {
            await patchMotrix({ auto_resume_all: e.target.checked });
          }}
        />
      </SettingItem>

      <SettingItem label={t("setting.Language")}>
        <Select
          size="small"
          value={getLanguage(motrix?.language ?? i18n.language)}
          onChange={(value) => patchMotrix({ language: value.target.value })}
          sx={{ "> div": { py: "7.5px" } }}
        >
          {AVAILABLE_LANGUAGES.map(({ label, value }) => (
            <MenuItem value={value} key={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </SettingItem>
    </SettingList>
  );
}

export default AppearanceSetting;
