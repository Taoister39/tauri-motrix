"use client";

import * as stylex from "@stylexjs/stylex";
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";

import { colors, metrics } from "../generated/tokens.stylex";

const move = stylex.keyframes({
  "0%": { transform: "translateX(-100%)" },
  "100%": { transform: "translateX(250%)" },
});
const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: metrics.space1,
    minWidth: 0,
    color: colors.text,
    fontFamily: metrics.fontFamily,
    fontSize: metrics.fontSizeSmall,
  },
  track: {
    height: "4px",
    backgroundColor: colors.border,
    borderRadius: metrics.radius,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: "inherit",
  },
  error: { backgroundColor: colors.error },
  success: { backgroundColor: colors.success },
  unknown: {
    width: "40%",
    animationName: {
      default: move,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.5s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});

export interface ProgressProps
  extends Omit<ComponentPropsWithRef<"div">, "children"> {
  value?: number;
  label?: ReactNode;
  showValue?: boolean;
  status?: "default" | "error" | "success";
}

export function Progress({
  value,
  label,
  showValue = false,
  status = "default",
  id,
  className,
  style,
  ...props
}: ProgressProps) {
  const labelId = useId();
  const percent =
    value === undefined || !Number.isFinite(value)
      ? undefined
      : Math.min(100, Math.max(0, value));
  const styling = stylex.props(styles.root);
  return (
    <div
      {...props}
      {...styling}
      id={id}
      role="progressbar"
      aria-labelledby={
        props["aria-labelledby"] ??
        (label && !props["aria-label"] ? labelId : undefined)
      }
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={[styling.className, className].filter(Boolean).join(" ")}
      style={{ ...styling.style, ...style }}
    >
      {label && <span id={labelId}>{label}</span>}
      <div {...stylex.props(styles.track)}>
        <div
          {...stylex.props(
            styles.bar,
            status === "error" && styles.error,
            status === "success" && styles.success,
            percent === undefined && styles.unknown,
          )}
          style={percent === undefined ? undefined : { width: `${percent}%` }}
        />
      </div>
      {showValue && percent !== undefined && (
        <span>{Math.round(percent)}%</span>
      )}
    </div>
  );
}
