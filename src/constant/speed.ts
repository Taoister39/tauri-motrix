export const SPEED_UNITS = [
  {
    label: "KB/s",
    value: "KB",
  },
  {
    label: "MB/s",
    value: "MB",
  },
] as const;

export type SpeedUnit = (typeof SPEED_UNITS)[number]["value"];

export const UNKNOWN_PEER_ID =
  "%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00";
export const UNKNOWN_PEER_ID_NAME = "unknown";
