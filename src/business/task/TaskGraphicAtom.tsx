import { Box } from "@mui/material";

import { ATOM_STATUS } from "@/constant/taskGraphicAtom";

export interface TaskGraphicAtomProps {
  status: ATOM_STATUS;
  width?: number;
  height?: number;
  radius?: number;
  x: number;
  y: number;
}

const ATOM_CLASS_PREFIX = "graphic-atom";

function TaskGraphicAtom({
  height = 10,
  radius = 2,
  status,
  width = 10,
  x,
  y,
}: TaskGraphicAtomProps) {
  const className = `${ATOM_CLASS_PREFIX} ${ATOM_CLASS_PREFIX}-s${status}`;

  return (
    <Box
      sx={({ palette }) => {
        const isDark = palette.mode === "dark";
        const outline = isDark ? undefined : "1px solid rgba(27, 31, 35, 0.06)";

        return {
          [`&.${ATOM_CLASS_PREFIX}`]: {
            shapeRendering: "geometricPrecision",
            outlineOffset: "-1px",
          },
          [`&.${ATOM_CLASS_PREFIX}-s${ATOM_STATUS.INACTIVE}`]: {
            fill: isDark ? "#161b22" : "#ebedf0",
            outline,
          },
          [`&.${ATOM_CLASS_PREFIX}-s${ATOM_STATUS.ACTIVE}`]: {
            fill: isDark ? "#0e4429" : "#9be9a8",
            outline,
          },
          [`&.${ATOM_CLASS_PREFIX}-s${ATOM_STATUS.COMPLETED}`]: {
            fill: isDark ? "#006d32" : "#40c463",
            outline,
          },
          [`&.${ATOM_CLASS_PREFIX}-s${ATOM_STATUS.ERROR}`]: {
            fill: isDark ? "#26a641" : "#30a14e",
            outline,
          },
          [`&.${ATOM_CLASS_PREFIX}-s${ATOM_STATUS.PAUSED}`]: {
            fill: isDark ? "#39d353" : "#39d353",
            outline,
          },
        };
      }}
      component="rect"
      className={className}
      x={x}
      y={y}
      rx={radius}
      ry={radius}
      width={width}
      height={height}
    />
  );
}

export default TaskGraphicAtom;
