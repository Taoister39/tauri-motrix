import * as stylex from "@stylexjs/stylex";
import { uni_utils } from "@tauri-motrix/unified-base";

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
      backgroundColor: "#5f656f",
      transitionProperty: "all",
      transitionDuration: "0.25s",
    },
    "::after": {
      transform: "scaleX(0.8)",
      content: "''",
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "0.125rem",
      backgroundColor: "#5f656f",
      transitionProperty: "all",
      transitionDuration: "0.25s",
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
    backgroundColor: "#5f656f",
    overflow: "hidden",
    transitionProperty: "opacity",
    transitionDuration: "0.25s",
  },
  menuSpanOpen: {
    opacity: 0,
  },
});

export interface MenuButtonProps extends IButtonProps {
  open?: boolean;
  onClick?: () => void;
}

function MenuButton(inProps: MenuButtonProps) {
  const resolvedProps = uni_utils.resolveProps(
    stylex.props(styles.root, inProps.open && styles.open),
    inProps,
    true,
  );

  return (
    <button {...resolvedProps}>
      <span
        {...stylex.props(styles.menuSpan, inProps.open && styles.menuSpanOpen)}
      >
        Menu
      </span>
    </button>
  );
}

export default MenuButton;
