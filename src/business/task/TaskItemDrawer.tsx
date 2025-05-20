import { Grid3x3Outlined, InfoOutline } from "@mui/icons-material";
import {
  Box,
  Drawer,
  listItemClasses,
  ModalProps,
  styled,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import TaskInfoPanel from "@/business/task/TaskInfoPanel";
import { TaskItemProps } from "@/business/task/TaskItem";
import TaskItemAction from "@/business/task/TaskItemAction";
import TaskSpeedPanel from "@/business/task/TaskSpeedPanel";
import { Aria2Task } from "@/services/aria2c_api";

export interface TaskItemDrawerProps
  extends Pick<
    TaskItemProps,
    "onCopyLink" | "onOpenFile" | "onPause" | "onResume" | "onStop"
  > {
  open: boolean;
  onClose: ModalProps["onClose"];
  task: Aria2Task;
}

const TheContainer = styled(Box)(
  ({
    theme: {
      palette: { mode },
    },
  }) => ({
    width: "400px",
    height: "100%",
    padding: "16px",
    backgroundColor: mode === "dark" ? "#1e1e1e" : "#f5f5f5",
    color: mode === "dark" ? "#fff" : "#000",
    [`.${listItemClasses.root}`]: {
      padding: "8px 0",
    },
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  }),
);
const enum TAB_TYPE {
  Info = "info",
  Speed = "speed",
}

function TaskItemDrawer({
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

  const mainElements = useMemo(() => {
    switch (tab) {
      case TAB_TYPE.Info:
        return <TaskInfoPanel task={task} />;
      case TAB_TYPE.Speed:
        return <TaskSpeedPanel task={task} />;
    }
  }, [tab, task]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <TheContainer role="presentation">
        <Typography
          variant="h6"
          sx={({ palette: { mode } }) => ({
            color: mode === "dark" ? "#bb86fc" : "#333",
            fontWeight: "700",
          })}
        >
          {t("task.Details")}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: "16px" }}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
            aria-label="basic tabs example"
          >
            <Tab icon={<InfoOutline />} value={TAB_TYPE.Info} />
            <Tab icon={<Grid3x3Outlined />} value={TAB_TYPE.Speed} />
          </Tabs>
        </Box>

        <Box sx={{ flex: "1 1 auto" }}>{mainElements}</Box>

        <Box
          style={{
            textAlign: "center",
          }}
        >
          <TaskItemAction
            status={task.status}
            gid={task.gid}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onOpenFile={onOpenFile}
            onCopyLink={onCopyLink}
          />
        </Box>
      </TheContainer>
    </Drawer>
  );
}

export default TaskItemDrawer;
