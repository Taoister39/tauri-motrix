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

/**
 * @see https://github.com/ngosang/trackerslist
 */
export const NGOSANG_TRACKERS_BEST_URL =
  "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt";
export const NGOSANG_TRACKERS_BEST_IP_URL =
  "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best_ip.txt";
export const NGOSANG_TRACKERS_ALL_URL =
  "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt";
export const NGOSANG_TRACKERS_ALL_IP_URL =
  "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all_ip.txt";

export const NGOSANG_TRACKERS_BEST_URL_CDN =
  "https://cdn.jsdelivr.net/gh/ngosang/trackerslist/trackers_best.txt";
export const NGOSANG_TRACKERS_BEST_IP_URL_CDN =
  "https://cdn.jsdelivr.net/gh/ngosang/trackerslist/trackers_best_ip.txt";
export const NGOSANG_TRACKERS_ALL_URL_CDN =
  "https://cdn.jsdelivr.net/gh/ngosang/trackerslist/trackers_all.txt";
export const NGOSANG_TRACKERS_ALL_IP_URL_CDN =
  "https://cdn.jsdelivr.net/gh/ngosang/trackerslist/trackers_all_ip.txt";

/**
 * @see https://github.com/XIU2/TrackersListCollection
 */
export const XIU2_TRACKERS_BEST_URL =
  "https://raw.githubusercontent.com/XIU2/TrackersListCollection/master/best.txt";
export const XIU2_TRACKERS_ALL_URL =
  "https://raw.githubusercontent.com/XIU2/TrackersListCollection/master/all.txt";
export const XIU2_TRACKERS_HTTP_URL =
  "https://raw.githubusercontent.com/XIU2/TrackersListCollection/master/http.txt";

export const XIU2_TRACKERS_BEST_URL_CDN =
  "https://cdn.jsdelivr.net/gh/XIU2/TrackersListCollection/best.txt";
export const XIU2_TRACKERS_ALL_URL_CDN =
  "https://cdn.jsdelivr.net/gh/XIU2/TrackersListCollection/all.txt";
export const XIU2_TRACKERS_HTTP_URL_CDN =
  "https://cdn.jsdelivr.net/gh/XIU2/TrackersListCollection/http.txt";

export const TRACKER_SOURCE_OPTIONS = [
  {
    url: "https://github.com/ngosang/trackerslist",
    label: "ngosang/trackerslist",
    options: [
      {
        value: NGOSANG_TRACKERS_BEST_URL,
        label: "trackers_best.txt",
        cdn: false,
      },
      {
        value: NGOSANG_TRACKERS_BEST_IP_URL,
        label: "trackers_best_ip.txt",
        cdn: false,
      },
      {
        value: NGOSANG_TRACKERS_ALL_URL,
        label: "trackers_all.txt",
        cdn: false,
      },
      {
        value: NGOSANG_TRACKERS_ALL_IP_URL,
        label: "trackers_all_ip.txt",
        cdn: false,
      },
      {
        value: NGOSANG_TRACKERS_BEST_URL_CDN,
        label: "trackers_best.txt",
        cdn: true,
      },
      {
        value: NGOSANG_TRACKERS_BEST_IP_URL_CDN,
        label: "trackers_best_ip.txt",
        cdn: true,
      },
      {
        value: NGOSANG_TRACKERS_ALL_URL_CDN,
        label: "trackers_all.txt",
        cdn: true,
      },
      {
        value: NGOSANG_TRACKERS_ALL_IP_URL_CDN,
        label: "trackers_all_ip.txt",
        cdn: true,
      },
    ],
  },
  {
    url: "https://github.com/XIU2/TrackersListCollection",
    label: "XIU2/TrackersListCollection",
    options: [
      {
        value: XIU2_TRACKERS_BEST_URL,
        label: "best.txt",
        cdn: false,
      },
      {
        value: XIU2_TRACKERS_ALL_URL,
        label: "all.txt",
        cdn: false,
      },
      {
        value: XIU2_TRACKERS_HTTP_URL,
        label: "http.txt",
        cdn: false,
      },
      {
        value: XIU2_TRACKERS_BEST_URL_CDN,
        label: "best.txt",
        cdn: true,
      },
      {
        value: XIU2_TRACKERS_ALL_URL_CDN,
        label: "all.txt",
        cdn: true,
      },
      {
        value: XIU2_TRACKERS_HTTP_URL_CDN,
        label: "http.txt",
        cdn: true,
      },
    ],
  },
];

export const MAX_BT_TRACKER_LENGTH = 6144;
