import { Grid3x3Outlined, InfoOutline } from "@mui/icons-material";
import { Box, Tab, Tabs } from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import TaskInfoPanel from "@/business/task/TaskInfoPanel";
import { TaskItemProps } from "@/business/task/TaskItem";
import TaskItemAction from "@/business/task/TaskItemAction";
import TaskSpeedPanel from "@/business/task/TaskSpeedPanel";
import BaseDrawer from "@/components/BaseDrawer";
import { Aria2Task } from "@/services/aria2c_api";

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
      contentSx={{
        width: "400px",
      }}
    >
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
    </BaseDrawer>
  );
}

export default TaskItemDrawer;
