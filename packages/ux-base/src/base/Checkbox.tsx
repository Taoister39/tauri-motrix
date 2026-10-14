"use client";

import * as stylex from "@stylexjs/stylex";
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";

import { colors, metrics } from "../generated/tokens.stylex";
import { controlStyles } from "../styles";
import type { ComponentSize } from "../tokens";

const styles = stylex.create({
  label: {
    display: "inline-flex",
    alignItems: "center",
    gap: metrics.space2,
    color: colors.text,
    fontFamily: metrics.fontFamily,
    fontSize: metrics.fontSize,
    cursor: "pointer",
  },
  input: {
    accentColor: colors.accent,
    flexShrink: 0,
    margin: 0,
    cursor: "inherit",
  },
  sm: { width: "14px", height: "14px" },
  md: { width: "18px", height: "18px" },
  lg: { width: "22px", height: "22px" },
  switch: {
    appearance: "none",
    width: "36px",
    height: "22px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "999px",
    position: "relative",
    boxSizing: "border-box",
    backgroundColor: { default: colors.surface, ":checked": colors.accent },
    "::before": {
      content: "''",
      display: "block",
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      position: "absolute",
      top: "2px",
      left: "2px",
      backgroundColor: colors.textSecondary,
      transitionDuration: {
        default: metrics.duration,
        "@media (prefers-reduced-motion: reduce)": "0ms",
      },
      transitionProperty: "transform",
    },
    ":checked::before": {
      transform: "translateX(14px)",
      backgroundColor: colors.onAccent,
    },
  },
  switchSm: {
    width: "30px",
    height: "18px",
    "::before": { width: "12px", height: "12px" },
    ":checked::before": { transform: "translateX(12px)" },
  },
  switchLg: {
    width: "44px",
    height: "26px",
    "::before": { width: "20px", height: "20px" },
    ":checked::before": { transform: "translateX(18px)" },
  },
});

export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<"input">, "type" | "size" | "children"> {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  size?: ComponentSize;
}

function CheckControl({
  label,
  helpText,
  error,
  size = "md",
  id,
  className,
  style,
  disabled,
  role,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error || helpText;
  const messageId = `${inputId}-message`;
  const styling = stylex.props(
    styles.input,
    styles[size],
    role === "switch" && styles.switch,
    role === "switch" && size === "sm" && styles.switchSm,
    role === "switch" && size === "lg" && styles.switchLg,
    controlStyles.focus,
  );
  return (
    <div {...stylex.props(controlStyles.field)}>
      <label
        htmlFor={inputId}
        {...stylex.props(styles.label, disabled && controlStyles.disabled)}
      >
        <input
          {...props}
          {...styling}
          id={inputId}
          type="checkbox"
          role={role}
          disabled={disabled}
          className={[styling.className, className].filter(Boolean).join(" ")}
          style={{ ...styling.style, ...style }}
          aria-invalid={error ? true : invalid}
          aria-describedby={
            [describedBy, message ? messageId : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {label}
      </label>
      {message && (
        <span
          id={messageId}
          {...stylex.props(controlStyles.help, !!error && controlStyles.error)}
        >
          {message}
        </span>
      )}
    </div>
  );
}

export function Checkbox(props: CheckboxProps) {
  return <CheckControl {...props} />;
}
export function Switch(props: CheckboxProps) {
  return <CheckControl {...props} role="switch" />;
}
