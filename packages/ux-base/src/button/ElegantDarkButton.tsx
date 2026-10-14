"use client";

import stylex from "@stylexjs/stylex";
import { ComponentPropsWithRef, ReactNode } from "react";

import { controlStyles } from "../styles";

const styles = stylex.create({
  root: {
    padding: "12px 24px",
    backgroundColor: "#2b2b2b",
    fontWeight: "bold",
    color: "white",
    borderRadius: "9999px",
  },
});

export interface ElegantDarkButtonProps
  extends ComponentPropsWithRef<"button"> {
  children: ReactNode;
}

function ElegantDarkButton({
  className,
  style,
  children,
  ...props
}: ElegantDarkButtonProps) {
  const resolvedProps = stylex.props(
    styles.root,
    controlStyles.focus,
    props.disabled && controlStyles.disabled,
  );

  return (
    <button
      type="button"
      {...props}
      {...resolvedProps}
      className={[resolvedProps.className, className].filter(Boolean).join(" ")}
      style={{ ...resolvedProps.style, ...style }}
    >
      {children}
    </button>
  );
}

export default ElegantDarkButton;
