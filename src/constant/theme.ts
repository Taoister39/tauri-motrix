import { themeValues } from "@tauri-motrix/ux-base/tokens";

const light = themeValues.light;
const dark = themeValues.dark;

// Keep legacy names for application consumers.
export const DEFAULT_THEME = {
  primary_color: light.accent,
  primary_text: light.text,
  secondary_text: light.textSecondary,
  info_color: light.info,
  error_color: light.error,
  warning_color: light.warning,
  success_color: light.success,
  background_color: light.canvas,
};

// dark mode
export const DEFAULT_DARK_THEME = {
  ...DEFAULT_THEME,
  primary_color: dark.accent,
  primary_text: dark.text,
  background_color: dark.canvas,
  secondary_text: dark.textSecondary,
  info_color: dark.info,
  error_color: dark.error,
  warning_color: dark.warning,
  success_color: dark.success,
};

export const THEME_MODES = ["light", "dark", "system"] as const;
