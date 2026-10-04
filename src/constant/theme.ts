// default theme setting
export const DEFAULT_THEME = {
  primary_color: "#007AFF",
  primary_text: "#000000",
  secondary_text: "#3C3C4399",
  info_color: "#007AFF",
  error_color: "#FF3B30",
  warning_color: "#FF9500",
  success_color: "#06943D",
  background_color: "#F5F5F5",
};

// dark mode
export const DEFAULT_DARK_THEME = {
  ...DEFAULT_THEME,
  primary_color: "#0A84FF",
  primary_text: "#FFFFFF",
  background_color: "#2E303D",
  secondary_text: "#EBEBF599",
  info_color: "#0A84FF",
  error_color: "#FF453A",
  warning_color: "#FF9F0A",
  success_color: "#30D158",
};

export const THEME_MODES = ["light", "dark", "system"] as const;
