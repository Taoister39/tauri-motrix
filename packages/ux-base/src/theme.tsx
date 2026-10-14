"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentPropsWithRef } from "react";

import { darkTheme, lightTheme, systemTheme } from "./generated/themes";
import { colors, metrics } from "./generated/tokens.stylex";
import type { ThemeMode } from "./tokens";

const styles = stylex.create({
  root: {
    color: colors.text,
    colorScheme: colors.scheme,
    fontFamily: metrics.fontFamily,
    fontSize: metrics.fontSize,
    lineHeight: metrics.lineHeight,
    minWidth: 0,
  },
});

export interface UxThemeProps extends ComponentPropsWithRef<"div"> {
  mode?: ThemeMode;
}

/** Scoped theme. Persistence and platform theme changes belong to the app. */
export function UxTheme({
  mode = "system",
  className,
  style,
  ...props
}: UxThemeProps) {
  const theme =
    mode === "light" ? lightTheme : mode === "dark" ? darkTheme : systemTheme;
  const themed = stylex.props(styles.root, theme);
  return (
    <div
      {...props}
      {...themed}
      className={[themed.className, className].filter(Boolean).join(" ")}
      style={{ ...themed.style, ...style }}
      data-ux-theme={mode}
    />
  );
}

export type { ThemeMode } from "./tokens";
