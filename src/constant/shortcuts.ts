export const GLOBAL_SHORTCUT_ACTIONS = [
  {
    key: "global_shortcut_show_window",
    status: "show_window",
    label: "ShowWindow",
  },
  {
    key: "global_shortcut_new_download",
    status: "new_download",
    label: "NewDownload",
  },
] as const;

export type GlobalShortcutAction = (typeof GLOBAL_SHORTCUT_ACTIONS)[number];
