import { useTheme } from "@mui/material";
import { useMemo, useSyncExternalStore } from "react";

import { getThemeSnapshot, subscribeTheme } from "@/store/theme";

export function useCustomTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot);

  // TODO: action for theme

  return { theme };
}

export function useIsDark() {
  const {
    palette: { mode },
  } = useTheme();

  return useMemo(() => mode === "dark", [mode]);
}
