import * as stylex from "@stylexjs/stylex";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { colors, metrics } from "../generated/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: metrics.space3,
    width: "100%",
    height: "100%",
    textAlign: "center",
    color: colors.textSecondary,
    fontFamily: metrics.fontFamily,
    fontSize: metrics.fontSizeLarge,
  },
  icon: { fontSize: "48px", lineHeight: 1 },
});

export interface EmptyStateProps
  extends Omit<ComponentPropsWithRef<"div">, "children"> {
  text: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  text,
  icon,
  action,
  className,
  style,
  ...props
}: EmptyStateProps) {
  const styling = stylex.props(styles.root);
  return (
    <div
      {...props}
      {...styling}
      className={[styling.className, className].filter(Boolean).join(" ")}
      style={{ ...styling.style, ...style }}
    >
      {icon && (
        <span aria-hidden="true" {...stylex.props(styles.icon)}>
          {icon}
        </span>
      )}
      <div>{text}</div>
      {action}
    </div>
  );
}
