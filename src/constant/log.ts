export const LOG_LEVELS = [
  {
    label: "Debug",
    value: "debug",
  },
  {
    label: "Info",
    value: "info",
  },
  {
    label: "Warn",
    value: "warning",
  },
  {
    label: "Error",
    value: "error",
  },
  {
    label: "Silent",
    value: "silent",
  },
  {
    label: "Trace",
    value: "trace",
  },
] as const;

export const enum APP_LOG_LEVEL {
  Trace = "trace",
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}
