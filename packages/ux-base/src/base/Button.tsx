"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentPropsWithRef } from "react";

import { colors, metrics } from "../generated/tokens.stylex";
import { controlStyles } from "../styles";
import type { ComponentSize } from "../tokens";

const styles = stylex.create({
  root: {
    appearance: "none",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: metrics.space2,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: metrics.radius,
    fontFamily: metrics.fontFamily,
    fontWeight: 600,
    lineHeight: metrics.lineHeight,
    cursor: "pointer",
    transitionProperty: "background-color, border-color",
    transitionDuration: {
      default: metrics.duration,
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
  },
  primary: {
    backgroundColor: { default: colors.accent, ":hover": colors.accentHover },
    color: colors.onAccent,
  },
  secondary: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: "transparent", color: colors.accent },
  sm: {
    minHeight: "28px",
    padding: "4px 10px",
    fontSize: metrics.fontSizeSmall,
  },
  md: { minHeight: "36px", padding: "6px 14px", fontSize: metrics.fontSize },
  lg: {
    minHeight: "44px",
    padding: "8px 18px",
    fontSize: metrics.fontSizeLarge,
  },
  square: { aspectRatio: "1", paddingInline: metrics.space2 },
});

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: "primary" | "secondary" | "ghost";
  size?: ComponentSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  const styling = stylex.props(
    styles.root,
    controlStyles.focus,
    styles[variant],
    styles[size],
    (disabled || loading) && controlStyles.disabled,
  );
  return (
    <button
      {...props}
      {...styling}
      className={[styling.className, className].filter(Boolean).join(" ")}
      style={{ ...styling.style, ...style }}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {children}
    </button>
  );
}

export type IconButtonProps = ButtonProps & { "aria-label": string };

export function IconButton({ className, ...props }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      {...props}
      className={[stylex.props(styles.square).className, className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
