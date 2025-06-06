import { Grid3x3Outlined, InfoOutline } from "@mui/icons-material";
import ExploreIcon from "@mui/icons-material/Explore";
import PersonIcon from "@mui/icons-material/Person";
import SourceIcon from "@mui/icons-material/Source";
import {
  Box,
  listClasses,
  listItemClasses,
  paperClasses,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import TaskClientPanel from "@/business/task/TaskClientPanel";
import TaskDiscoverPanel from "@/business/task/TaskDiscoverPanel";
import TaskFilesPanel from "@/business/task/TaskFilesPanel";
import TaskInfoPanel from "@/business/task/TaskInfoPanel";
import { TaskItemProps } from "@/business/task/TaskItem";
import TaskItemAction from "@/business/task/TaskItemAction";
import TaskSpeedPanel from "@/business/task/TaskSpeedPanel";
import { AntTab, AntTabs } from "@/client/styled_compose";
import BaseDrawer from "@/components/BaseDrawer";
import { Aria2Task } from "@/services/aria2c_api";
import { checkTaskIsBT } from "@/utils/task";

export interface TaskItemDrawerProps
  extends Pick<
    TaskItemProps,
    "onCopyLink" | "onOpenFile" | "onPause" | "onResume" | "onStop"
  > {
  open: boolean;
  onClose: () => void;
  task: Aria2Task;
}

const enum TAB_TYPE {
  Info = "info",
  Speed = "speed",
  Discover = "discover",
  Client = "client",
  Files = "files",
}

function TaskDetailsDrawer({
  open,
  onClose,
  task,
  onCopyLink,
  onOpenFile,
  onPause,
  onResume,
  onStop,
}: TaskItemDrawerProps) {
  const { t } = useTranslation();

  const [tab, setTab] = useState<TAB_TYPE>(TAB_TYPE.Info);

  const theme = useTheme();
  const isDownSm = useMediaQuery(theme.breakpoints.down("sm"));

  const isBt = checkTaskIsBT(task);

  const mainElements = useMemo(() => {
    switch (tab) {
      case TAB_TYPE.Info:
        return <TaskInfoPanel task={task} />;
      case TAB_TYPE.Speed:
        return <TaskSpeedPanel task={task} />;
      case TAB_TYPE.Files:
        return <TaskFilesPanel files={task.files} gid={task.gid} />;
      case TAB_TYPE.Discover:
        return (
          <TaskDiscoverPanel announceList={task.bittorrent!.announceList} />
        );
      case TAB_TYPE.Client:
        return <TaskClientPanel gid={task.gid} />;
    }
  }, [tab, task]);

  return (
    <BaseDrawer
      title={t("task.Details")}
      anchor="right"
      open={open}
      onClose={onClose}
      action={
        <TaskItemAction
          status={task.status}
          gid={task.gid}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onOpenFile={onOpenFile}
          onCopyLink={onCopyLink}
        />
      }
      header={
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <AntTabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            aria-label="task details tabs example"
          >
            <AntTab icon={<InfoOutline />} value={TAB_TYPE.Info} />
            <AntTab icon={<Grid3x3Outlined />} value={TAB_TYPE.Speed} />

            {isBt && (
              <AntTab
                icon={<ExploreIcon fontSize="small" />}
                value={TAB_TYPE.Discover}
              />
            )}
            {isBt && <AntTab icon={<PersonIcon />} value={TAB_TYPE.Client} />}
            <AntTab icon={<SourceIcon />} value={TAB_TYPE.Files} />
          </AntTabs>
        </Box>
      }
      sx={{
        [`> .${paperClasses.root}`]: {
          width: isDownSm ? "450px" : "61.8%",
        },
        [`.${listItemClasses.root}`]: {
          padding: "8px 0",
        },
      }}
    >
      <Box
        sx={{
          flex: "1 1 auto",
          pt: "8px",
          [`.${listClasses.padding}`]: {
            pt: 0,
          },
        }}
      >
        {mainElements}
      </Box>
    </BaseDrawer>
  );
}

export default TaskDetailsDrawer;
