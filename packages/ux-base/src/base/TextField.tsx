"use client";

import * as stylex from "@stylexjs/stylex";
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";

import { colors, metrics } from "../generated/tokens.stylex";
import { controlStyles } from "../styles";
import type { ComponentSize } from "../tokens";

const styles = stylex.create({
  input: {
    boxSizing: "border-box",
    minWidth: 0,
    width: "100%",
    fontFamily: metrics.fontFamily,
    lineHeight: metrics.lineHeight,
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: metrics.radius,
  },
  sm: { padding: "4px 8px", fontSize: metrics.fontSizeSmall },
  md: { padding: "6px 10px", fontSize: metrics.fontSize },
  lg: { padding: "8px 12px", fontSize: metrics.fontSizeLarge },
  invalid: { borderColor: colors.error },
});

export interface TextFieldProps
  extends Omit<ComponentPropsWithRef<"input">, "size"> {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  size?: ComponentSize;
}

export function TextField({
  label,
  helpText,
  error,
  size = "md",
  id,
  className,
  style,
  disabled,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error || helpText;
  const messageId = `${inputId}-message`;
  const styling = stylex.props(
    styles.input,
    styles[size],
    controlStyles.focus,
    !!error && styles.invalid,
    disabled && controlStyles.disabled,
  );
  return (
    <div {...stylex.props(controlStyles.field)}>
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        {...styling}
        id={inputId}
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
