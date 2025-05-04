export const buildAtom = (
  index: number,
  bitfield: string,
  offset: number,
  atomWG: number,
  atomHG: number,
  columnCount: number,
) => {
  const hIndex = index + 1;
  let chIndex = index % columnCount;
  let rhIndex = Math.trunc(index / columnCount);
  chIndex = chIndex < 0 ? 0 : chIndex;
  rhIndex = rhIndex < 0 ? 0 : rhIndex;
  const result = {
    id: `${hIndex}`,
    status: Math.floor(parseInt(bitfield[index], 16) / 4),
    x: chIndex * atomWG,
    y: offset + rhIndex * atomHG,
  };

  return result;
};
