/** Platform-independent values. Keep theme colors in this single source. */
export const themeValues = {
  light: {
    accent: "#007AFF",
    text: "#000000",
    textSecondary: "#3C3C4399",
    info: "#007AFF",
    error: "#FF3B30",
    warning: "#FF9500",
    success: "#06943D",
    canvas: "#F5F5F5",
    surface: "#FFFFFF",
    border: "#D1D1D6",
    focus: "#007AFF",
    onAccent: "#FFFFFF",
    accentHover: "#0063CC",
    scheme: "light",
  },
  dark: {
    accent: "#0A84FF",
    text: "#FFFFFF",
    textSecondary: "#EBEBF599",
    info: "#0A84FF",
    error: "#FF453A",
    warning: "#FF9F0A",
    success: "#30D158",
    canvas: "#2E303D",
    surface: "#2E303D",
    border: "#50515C",
    focus: "#0A84FF",
    onAccent: "#FFFFFF",
    accentHover: "#0070E0",
    scheme: "dark",
  },
} as const;

export const designTokens = {
  fontFamily: '"Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
  fontSize: "14px",
  fontSizeSmall: "12px",
  fontSizeLarge: "16px",
  lineHeight: "1.5",
  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space6: "24px",
  radiusSmall: "4px",
  radius: "8px",
  radiusLarge: "12px",
  duration: "150ms",
  easing: "ease-out",
} as const;

export type ThemeMode = "light" | "dark" | "system";
export type ComponentSize = "sm" | "md" | "lg";
