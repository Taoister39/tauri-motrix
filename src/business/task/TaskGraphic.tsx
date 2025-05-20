import { memo, useMemo } from "react";

import TaskGraphicAtom from "@/business/task/TaskGraphicAtom";
import { buildAtom } from "@/utils/build_atom";

export interface TaskGraphicProps {
  bitfield: string;
  outerWidth?: number;
  atomWidth?: number;
  atomHeight?: number;
  atomGutter?: number;
  atomRadius?: number;
}

function TaskGraphic({
  atomGutter = 3,
  atomHeight = 10,
  atomRadius = 2,
  atomWidth = 10,
  bitfield,
  outerWidth = 240,
}: TaskGraphicProps) {
  const atomWG = atomWidth + atomGutter; // atom width + gutter
  const atomHG = atomHeight + atomGutter; // atom height + gutter
  const columnCount = (outerWidth - atomWidth) / atomWG + 1;
  const rowCount = bitfield.length / columnCount + 1;

  const offset = useMemo(() => {
    const totalWidth = atomWG * (columnCount - 1) + atomWidth;
    const result = (outerWidth - totalWidth) / 2;

    return parseFloat(result.toFixed(2));
  }, [atomWG, atomWidth, columnCount, outerWidth]);

  const atoms = useMemo(() => {
    const result = [];
    let row = [];
    for (let i = 0; i < bitfield.length; i++) {
      row.push(buildAtom(i, bitfield, offset, atomWG, atomHG, columnCount));

      if ((i + 1) % columnCount === 0) {
        result.push(row);
        row = [];
      }
    }
    result.push(row);

    return result;
  }, [bitfield, offset, atomWG, atomHG, columnCount]);

  const width = atomWG * (columnCount - 1) + atomWidth;
  const height = atomHG * (rowCount - 1) + atomHeight + offset * 2;
  const viewBox = `0 0 ${width} ${height}`;

  return (
    <svg width={width} viewBox={viewBox} height={height}>
      {atoms.map((row, index) => (
        <g key={`g-${index}`}>
          {row.map((atom) => (
            <TaskGraphicAtom
              x={atom.x}
              y={atom.y}
              key={`atom-${atom.id}`}
              width={atomWidth}
              height={atomHeight}
              status={atom.status}
              radius={atomRadius}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default memo(TaskGraphic);
