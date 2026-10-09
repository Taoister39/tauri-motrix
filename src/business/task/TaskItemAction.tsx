import {
  CloseOutlined,
  FileOpenOutlined,
  InfoOutlined,
  LinkOutlined,
  PauseOutlined,
  PlayArrowOutlined,
  RefreshOutlined,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { TaskItemProps } from "@/business/task/TaskItem";
import { TaskActionButton } from "@/client/task_compose";
import { TASK_STATUS_ENUM } from "@/constant/task";

export interface TaskItemActionProps
  extends Pick<
    TaskItemProps,
    "onPause" | "onResume" | "onStop" | "onOpenFile" | "onCopyLink"
  > {
  status: string;
  gid: string;
  onShowInfo?: (taskId: string) => void;
}

function TaskItemAction({
  status,
  gid,
  onCopyLink,
  onOpenFile,
  onPause,
  onResume,
  onStop,
  onShowInfo,
}: TaskItemActionProps) {
  const { t } = useTranslation();

  const statusActionElem = useMemo(() => {
    switch (status) {
      case TASK_STATUS_ENUM.Active:
      case TASK_STATUS_ENUM.Waiting:
        return (
          <TaskActionButton
            title={t("task.Pause")}
            icon={<PauseOutlined />}
            onClick={() => onPause(gid)}
          />
        );
      case TASK_STATUS_ENUM.Pause:
        return (
          <TaskActionButton
            title={t("task.Resume")}
            icon={<PlayArrowOutlined />}
            onClick={() => onResume(gid)}
          />
        );
      case TASK_STATUS_ENUM.Error:
        return (
          <TaskActionButton
            title={t("task.Retry")}
            icon={<RefreshOutlined />}
            onClick={() => onResume(gid)}
          />
        );
    }
  }, [onPause, onResume, status, t, gid]);

  return (
    <Box>
      {statusActionElem}
      <TaskActionButton
        title={t("task.Close")}
        onClick={() => onStop(gid)}
        icon={<CloseOutlined />}
      />
      <TaskActionButton
        title={t("task.OpenFile")}
        icon={<FileOpenOutlined />}
        onClick={() => onOpenFile(gid)}
      />

      <TaskActionButton
        title={t("task.CopyLink")}
        icon={<LinkOutlined />}
        onClick={() => onCopyLink(gid)}
      />
      {onShowInfo && (
        <TaskActionButton
          title={t("task.Info")}
          icon={<InfoOutlined />}
          onClick={() => onShowInfo(gid)}
        />
      )}
    </Box>
  );
}

export default TaskItemAction;
