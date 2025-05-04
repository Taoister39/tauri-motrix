import {
  Box,
  Divider,
  Drawer,
  listItemClasses,
  ModalProps,
  styled,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import TaskGraphic from "@/business/task/TaskGraphic";
import { TaskItemProps } from "@/business/task/TaskItem";
import TaskItemAction from "@/business/task/TaskItemAction";
import { TaskDrawerItem, TaskDrawerList } from "@/client/task_compose";
import LinearProgressWithLabel from "@/components/LinearProgressWithLabel";
import { Aria2Task } from "@/services/aria2c_api";
import { parseByteVo } from "@/utils/download";
import { getTaskName, getTaskProgressColor } from "@/utils/task";

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
  }),
);

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
  const taskName = getTaskName(task);

  const { status, bitfield } = task;

  const totalLength = Number(task.totalLength) || 0;
  const completedLength = Number(task.completedLength) || 0;
  const progress = (completedLength / totalLength) * 100 || 0;

  const speedVo = parseByteVo(task.downloadSpeed, "/s").join("");

  const completed = parseByteVo(completedLength).join("");
  const total = parseByteVo(totalLength).join("");
  const progressText = `${completed} / ${total}`;

  const progressColor = useMemo(
    () => getTaskProgressColor(progress, status),
    [progress, status],
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <TheContainer role="presentation">
        <Typography
          variant="h6"
          sx={({ palette: { mode } }) => ({
            marginBottom: "16px",
            color: mode === "dark" ? "#bb86fc" : "#333",
            fontWeight: "700",
          })}
        >
          {t("task.Details")}
        </Typography>
        <TaskDrawerList title={t("task.InfoDetails")}>
          <TaskDrawerItem label="GID" value={task.gid} />
          <Divider />
          <TaskDrawerItem label="Task Name" value={taskName} />
          <Divider />
          <TaskDrawerItem label="Save to" value={task.dir} />
          <Divider />
          <TaskDrawerItem label="Status" value={task.status} />
        </TaskDrawerList>

        <TaskDrawerList title={t("task.SpeedDetails")}>
          <LinearProgressWithLabel value={progress} color={progressColor} />
          <TaskDrawerItem label="Progress" value={progressText} />
          <TaskDrawerItem label="Connections" value={task.connections} />
          <TaskDrawerItem label="Download Speed" value={speedVo} />
        </TaskDrawerList>

        {bitfield && (
          <section>
            <TaskGraphic bitfield={bitfield} outerWidth={400} />
          </section>
        )}
        <section
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
        </section>
      </TheContainer>
    </Drawer>
  );
}

export default TaskItemDrawer;
