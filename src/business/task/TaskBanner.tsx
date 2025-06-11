import {
  CloseOutlined,
  PauseOutlined,
  PlayArrowOutlined,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import { TaskBannerAction } from "@/client/task_compose";
import { TASK_STATUS_ENUM } from "@/constant/task";

interface TaskBannerProps {
  selectedTaskIds: string[];
  fetchType: TASK_STATUS_ENUM;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSelectAll: () => void;
}

function TaskBanner({
  selectedTaskIds,
  fetchType,
  onPause,
  onResume,
  onStop,
  onSelectAll,
}: TaskBannerProps) {
  const { t } = useTranslation();

  const count = selectedTaskIds.length;
  const noneSelected = count === 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <span>{t("task.Selected", { count })}</span>

      <TaskBannerAction
        text={t("common.All")}
        color="secondary"
        onClick={() => onSelectAll()}
      />
      <TaskBannerAction
        title={t("task.CloseAll")}
        disabled={noneSelected}
        icon={<CloseOutlined />}
        onClick={() => onStop()}
        color="warning"
        text={t("common.Delete")}
      />
      {fetchType === TASK_STATUS_ENUM.Active && (
        <>
          <TaskBannerAction
            disabled={noneSelected}
            title={t("task.ResumeAll")}
            text={t("common.Start")}
            icon={<PlayArrowOutlined />}
            onClick={() => onResume()}
            color="success"
          />

          <TaskBannerAction
            title={t("task.PauseAll")}
            disabled={noneSelected}
            icon={<PauseOutlined />}
            onClick={() => onPause()}
            color="primary"
            text={t("common.Pause")}
          />
        </>
      )}
    </Box>
  );
}

export default TaskBanner;
