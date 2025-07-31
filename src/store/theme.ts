import { createTheme } from "@mui/material";

import { DEFAULT_DARK_THEME, DEFAULT_THEME } from "@/constant/theme";

const theme = createTheme({
  colorSchemes: {
    dark: {
      palette: {
        primary: { main: DEFAULT_DARK_THEME.primary_color },
        info: { main: DEFAULT_DARK_THEME.info_color },
        error: { main: DEFAULT_DARK_THEME.error_color },
        warning: { main: DEFAULT_DARK_THEME.warning_color },
        success: { main: DEFAULT_DARK_THEME.success_color },
        text: {
          primary: DEFAULT_DARK_THEME.primary_text,
          secondary: DEFAULT_DARK_THEME.secondary_text,
        },
        background: {
          paper: DEFAULT_DARK_THEME.background_color,
        },
      },
    },
    light: {
      palette: {
        primary: { main: DEFAULT_THEME.primary_color },
        info: { main: DEFAULT_THEME.info_color },
        error: { main: DEFAULT_THEME.error_color },
        warning: { main: DEFAULT_THEME.warning_color },
        success: { main: DEFAULT_THEME.success_color },
        text: {
          primary: DEFAULT_THEME.primary_text,
          secondary: DEFAULT_THEME.secondary_text,
        },
        background: {
          // paper: DEFAULT_THEME.background_color,
        },
      },
    },
  },
});

export type SubscribeListener = (t: typeof theme) => void;
const listeners = new Set<SubscribeListener>();

export function getThemeSnapshot() {
  return theme;
}

export function subscribeTheme(listener: SubscribeListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
