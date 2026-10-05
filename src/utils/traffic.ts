export const getTrafficGraphY = (
  speed: number,
  peakSpeed: number,
  height: number,
) => {
  const maxSpeed = Math.max(1024, peakSpeed) * 1.1;
  const ratio = Math.min(1, Math.max(0, speed) / maxSpeed);

  return height - 1 - ratio * (height - 2);
};
