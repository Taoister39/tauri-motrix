import { Button, ButtonGroup, useColorScheme } from "@mui/material";
import { app } from "@tauri-apps/api";
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
    <ButtonGroup size="small" sx={{ my: "4px" }}>
      {THEME_MODES.map((value) => (
        <Button
          key={value}
          onClick={() => {
            void onChangeMode(value);
          }}
          variant={value === mode ? "contained" : "outlined"}
        >
          {t(`ThemeMode.${value}`)}
        </Button>
      ))}
    </ButtonGroup>
  );
}

export default ThemeModeSwitch;
