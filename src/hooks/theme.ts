import { useSyncExternalStore } from "react";

import { getThemeSnapshot, subscribeTheme } from "@/store/theme";

export function useCustomTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot);

  // TODO: action for theme

  return { theme };
}
