import { MenuItem, Select } from "@mui/material";
import { useTranslation } from "react-i18next";

import { SettingItem, SettingList } from "@/client/setting_compose";
import { useMotrix } from "@/hooks/motrix";

export default function VortexSetting() {
  const { t } = useTranslation();
  const { motrix, patchMotrix } = useMotrix();
  return (
    <SettingList title="Vortex">
      <SettingItem
        label={t("vortex.Engine")}
        secondary={t("vortex.Description")}
      >
        <Select
          size="small"
          value={motrix?.http_engine ?? "aria2c"}
          onChange={(e) =>
            patchMotrix({ http_engine: e.target.value as "aria2c" | "vortex" })
          }
        >
          <MenuItem value="aria2c">aria2</MenuItem>
          <MenuItem value="vortex">Vortex</MenuItem>
        </Select>
      </SettingItem>
      <SettingItem
        label={t("vortex.Tasks")}
        secondary={t("vortex.RestartRequired")}
      >
        <Select
          size="small"
          value={motrix?.vortex_max_tasks ?? 3}
          onChange={(e) =>
            patchMotrix({ vortex_max_tasks: Number(e.target.value) })
          }
        >
          {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </Select>
      </SettingItem>
      <SettingItem
        label={t("vortex.Connections")}
        secondary={t("vortex.ResumeDescription")}
      >
        <Select
          size="small"
          value={motrix?.vortex_connections ?? 4}
          onChange={(e) =>
            patchMotrix({ vortex_connections: Number(e.target.value) })
          }
        >
          {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </Select>
      </SettingItem>
    </SettingList>
  );
}
