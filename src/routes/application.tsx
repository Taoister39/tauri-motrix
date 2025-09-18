import {
  HistoryRounded,
  PlayArrowRounded,
  ScienceRounded,
  SettingsRounded,
} from "@mui/icons-material";
import { ReactNode } from "react";
import { Navigate, RouteObject } from "react-router";

import DownloadingPage from "@/pages/Downloading";
import HistoryPage from "@/pages/History";
import LabPage from "@/pages/Lab";
import SettingsPage from "@/pages/Settings";

type IRoute = RouteObject & { label?: string; icon?: ReactNode };

export const routers: IRoute[] = [
  {
    path: "/",
    element: <Navigate to="/task-start" />,
  },
  {
    label: "Label-Task-Downloading",
    path: "/task-start",
    icon: <PlayArrowRounded />,
    element: <DownloadingPage />,
  },

  {
    label: "Label-Task-History",
    path: "/history",
    icon: <HistoryRounded />,
    element: <HistoryPage />,
  },
  {
    label: "Label-Settings",
    path: "/settings",
    icon: <SettingsRounded />,
    element: <SettingsPage />,
  },
  {
    label: "Label-Lab",
    path: "/lab",
    icon: <ScienceRounded />,
    element: <LabPage />,
  },
];
