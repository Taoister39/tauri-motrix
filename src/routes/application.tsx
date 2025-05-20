import {
  DoneRounded,
  HistoryRounded,
  PlayArrowRounded,
  SettingsRounded,
} from "@mui/icons-material";
import { ReactNode } from "react";
import { Navigate, RouteObject } from "react-router-dom";

import DonePage from "@/pages/Done";
import DownloadingPage from "@/pages/Downloading";
import HistoryPage from "@/pages/History";
import SettingsPage from "@/pages/Settings";

type IRoute = RouteObject & { label?: string; icon?: ReactNode };

export const routers: IRoute[] = [
  {
    path: "/",
    element: <Navigate to="/task-start" />,
  },
  {
    label: "Label-Task-Active",
    path: "/task-start",
    icon: <PlayArrowRounded />,
    element: <DownloadingPage />,
  },
  {
    label: "Label-Task-Done",
    path: "/task-done",
    icon: <DoneRounded />,
    element: <DonePage />,
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
];
