import { useColorScheme } from "@mui/material";
import { UxTheme, type UxThemeProps } from "@tauri-motrix/ux-base/theme";

/** Read MUI's existing mode; do not introduce a second preference store. */
export function UxThemeBridge(props: Omit<UxThemeProps, "mode">) {
  const { mode } = useColorScheme();
  return <UxTheme {...props} mode={mode ?? "system"} />;
}
