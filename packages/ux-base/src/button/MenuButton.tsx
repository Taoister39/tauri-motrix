"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentPropsWithRef } from "react";

import { colors } from "../generated/tokens.stylex";
import { controlStyles } from "../styles";

const styles = stylex.create({
  root: {
    borderWidth: 0,
    height: "1.5rem",
    width: "1.875rem",
    position: "relative",
    cursor: "pointer",
    backgroundColor: "transparent",
    padding: 0,
    "::before": {
      transform: "scaleX(0.8)",
      content: "''",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "0.125rem",
      backgroundColor: colors.textSecondary,
      transitionProperty: "all",
      transitionDuration: {
        default: "0.25s",
        "@media (prefers-reduced-motion: reduce)": "0s",
      },
    },
    "::after": {
      transform: "scaleX(0.8)",
      content: "''",
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "0.125rem",
      backgroundColor: colors.textSecondary,
      transitionProperty: "all",
      transitionDuration: {
        default: "0.25s",
        "@media (prefers-reduced-motion: reduce)": "0s",
      },
    },
  },
  open: {
    "::before": {
      transform: "rotate(45deg)",
      top: "50%",
    },
    "::after": {
      transform: "rotate(-45deg)",
      top: "50%",
      bottom: "auto",
    },
  },
  menuSpan: {
    height: "0.125rem",
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.textSecondary,
    overflow: "hidden",
    color: "transparent",
    transitionProperty: "opacity",
    transitionDuration: {
      default: "0.25s",
      "@media (prefers-reduced-motion: reduce)": "0s",
    },
  },
  menuSpanOpen: {
    opacity: 0,
  },
});

export interface MenuButtonProps extends ComponentPropsWithRef<"button"> {
  open?: boolean;
}

function MenuButton({
  open = false,
  type = "button",
  className,
  style,
  children,
  "aria-label": label = "Menu",
  ...props
}: MenuButtonProps) {
  const resolvedProps = stylex.props(
    styles.root,
    open && styles.open,
    controlStyles.focus,
    props.disabled && controlStyles.disabled,
  );

  return (
    <button
      {...props}
      {...resolvedProps}
      className={[resolvedProps.className, className].filter(Boolean).join(" ")}
      style={{ ...resolvedProps.style, ...style }}
      type={type}
      aria-label={label}
      aria-expanded={open}
    >
      <span
        aria-hidden="true"
        {...stylex.props(styles.menuSpan, open && styles.menuSpanOpen)}
      >
        Menu
      </span>
      {children}
    </button>
  );
}

export default MenuButton;
