import { CssBaseline, useMediaQuery } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { type PropsWithChildren, useMemo } from "react";

import { festivalTokens, type ThemeMode } from "../tokens";

export function createFestivalTheme(mode: "light" | "dark") {
  const colors = festivalTokens[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: colors.primary, contrastText: colors.onPrimary },
      secondary: { main: colors.pink, contrastText: "#182552" },
      background: { default: colors.canvas, paper: colors.paper },
      text: { primary: colors.ink, secondary: colors.muted },
      divider: colors.outline,
      success: { main: colors.onMint },
      error: { main: colors.error },
    },
    shape: { borderRadius: festivalTokens.radius },
    spacing: festivalTokens.spacing,
    typography: {
      fontFamily: festivalTokens.fontFamily,
      fontSize: 13,
      button: { textTransform: "none", fontWeight: 700 },
      h1: { fontSize: "2rem", fontWeight: 900, lineHeight: 1.05 },
      h2: { fontSize: "1.25rem", fontWeight: 700 },
      h3: { fontSize: "1rem", fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { margin: 0 },
          "*:focus-visible": {
            outline: `3px solid ${colors.primary}`,
            outlineOffset: 3,
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animation: "none !important",
              transition: "none !important",
              scrollBehavior: "auto !important",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 40, borderRadius: 9 },
          contained: {
            boxShadow: `3px 3px 0 ${colors.shadow}`,
            "&:hover": { boxShadow: `1px 1px 0 ${colors.shadow}` },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 7, fontWeight: 700 },
          sizeSmall: { height: 26 },
        },
      },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiDialog: {
        styleOverrides: { paper: { border: `1px solid ${colors.outline}` } },
      },
      MuiTooltip: { defaultProps: { enterDelay: 400 } },
    },
  });
}

export function FestivalProvider({
  mode = "system",
  children,
}: PropsWithChildren<{ mode?: ThemeMode }>) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  const theme = useMemo(() => createFestivalTheme(resolved), [resolved]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
