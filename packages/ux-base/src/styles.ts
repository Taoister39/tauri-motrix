import * as stylex from "@stylexjs/stylex";

import { colors, metrics } from "./generated/tokens.stylex";

export const controlStyles = stylex.create({
  focus: {
    outline: { default: "none", ":focus-visible": `2px solid ${colors.focus}` },
    outlineOffset: "3px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: metrics.space1,
    minWidth: 0,
    fontFamily: metrics.fontFamily,
    fontSize: metrics.fontSize,
    color: colors.text,
  },
  help: { color: colors.textSecondary, fontSize: metrics.fontSizeSmall },
  error: { color: colors.error },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
});
