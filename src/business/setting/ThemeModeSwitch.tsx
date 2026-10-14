import { useColorScheme } from "@mui/material";
import { app } from "@tauri-apps/api";
import { Button } from "@tauri-motrix/ux-base/components";
import { useTranslation } from "react-i18next";

import { THEME_MODES } from "@/constant/theme";

function ThemeModeSwitch() {
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();

  if (!mode) {
    return null;
  }

  const onChangeMode = async (value: (typeof THEME_MODES)[number]) => {
    await app.setTheme(value === "system" ? null : value);
    setMode(value);
  };

  return (
    <div
      role="group"
      aria-label={t("setting.ThemeMode")}
      style={{ display: "flex", gap: 4, marginBlock: 4 }}
    >
      {THEME_MODES.map((value) => (
        <Button
          key={value}
          onClick={() => {
            void onChangeMode(value);
          }}
          size="sm"
          variant={value === mode ? "primary" : "secondary"}
          aria-pressed={value === mode}
        >
          {t(`ThemeMode.${value}`)}
        </Button>
      ))}
    </div>
  );
}

export default ThemeModeSwitch;
