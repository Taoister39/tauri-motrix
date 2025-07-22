import stylex from "@stylexjs/stylex";
import { uni_utils } from "@tauri-motrix/unified-base";
import { ReactNode } from "react";

const styles = stylex.create({
  root: {
    padding: "12px 24px",
    backgroundColor: "#2b2b2b",
    fontWeight: "bold",
    color: "white",
    borderRadius: "9999px",
  },
});

export interface ElegantDarkButtonProps extends IButtonProps {
  children: ReactNode;
}

function ElegantDarkButton(inProps: ElegantDarkButtonProps) {
  const resolvedProps = uni_utils.resolveProps(
    stylex.props(styles.root),
    inProps,
    true,
  );

  return <button {...resolvedProps}>{inProps.children}</button>;
}

export default ElegantDarkButton;
