import {
  Box,
  boxClasses,
  Checkbox,
  iconButtonClasses,
  LinearProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  listItemIconClasses,
  ListItemText,
  Typography,
  typographyClasses,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import TaskDetailsDrawer from "@/business/task/TaskDetailsDrawer";
import TaskItemAction from "@/business/task/TaskItemAction";
import { TaskDownloadDes } from "@/client/task_compose";
import { TASK_STATUS_ENUM } from "@/constant/task";
import { Aria2Task } from "@/services/aria2c_api";
import { parseByteVo } from "@/utils/download";
import {
  getTaskName,
  getTaskProgressColor,
  timeFormat,
  timeRemaining,
} from "@/utils/task";

export interface TaskItemProps {
  task: Aria2Task;
  selected: boolean;
  onSelect: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onStop: (taskId: string) => void;
  onOpenFile: (taskId: string) => void;
  onCopyLink: (task: string) => void;
}

function TaskItem({
  onSelect,
  task,
  selected,
  onPause,
  onResume,
  onStop,
  onOpenFile,
  onCopyLink,
}: TaskItemProps) {
  const { t } = useTranslation("task");

  const theme = useTheme();

  const isDownSm = useMediaQuery(theme.breakpoints.down("sm"));

  const { connections, gid, status } = task;

  const totalLength = Number(task.totalLength);
  const completedLength = Number(task.completedLength) || 0;
  const downloadSpeed = Number(task.downloadSpeed) || 0;
  const progress = (completedLength / totalLength) * 100 || 0;

  const speedVo = parseByteVo(downloadSpeed, "/s").join("");

  const [openInfo, setOpenInfo] = useState(false);

  const remainingVo = useMemo(() => {
    let result = `${timeFormat(
      timeRemaining(totalLength, completedLength, downloadSpeed),
    )}`;

    if (!isDownSm) {
      result = `${t("Remaining", { ns: "common" })} ${result}`;
    }
    return result;
  }, [completedLength, downloadSpeed, isDownSm, t, totalLength]);

  const progressColor = useMemo(
    () => getTaskProgressColor(progress, status),
    [progress, status],
  );

  const progressText = useMemo(() => {
    const completed = parseByteVo(completedLength).join("");
    const total = parseByteVo(totalLength).join("");

    return `${completed} / ${total}`;
  }, [completedLength, totalLength]);

  const onClose = useCallback(() => {
    setOpenInfo(false);
  }, []);

  return (
    <ListItem disablePadding>
      <ListItemButton
        sx={({ palette }) => ({
          bgcolor: palette.background.paper,
          ":hover": { bgcolor: palette.background.paper },
          borderRadius: "8px",
          [`& .${listItemIconClasses.root}`]: {
            minWidth: "40px",
          },
        })}
        onClick={() => onSelect(gid)}
      >
        <ListItemIcon>
          <Checkbox edge="start" checked={selected} />
        </ListItemIcon>

        <ListItemText
          sx={{
            display: "table",
            tableLayout: "fixed",
            width: "100%",
            [`& .${typographyClasses.body1}`]: {
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            },
          }}
          slots={{ secondary: "div" }}
          primary={getTaskName(task)}
          secondary={
            <Fragment>
              <Typography
                variant="body2"
                sx={{ color: "text.primary", display: "inline" }}
              >
                {progressText}
              </Typography>
              {TASK_STATUS_ENUM.Active === status && (
                <TaskDownloadDes
                  speed={speedVo}
                  connections={connections}
                  remaining={remainingVo}
                />
              )}
            </Fragment>
          }
        />

        <Box
          sx={{
            [`.${boxClasses.root}`]: {
              [`.${iconButtonClasses.root}:last-child`]: {
                paddingRight: 0,
              },
              textAlign: "end",
              justifyContent: "end",
              textWrap: "nowrap",
            },
          }}
        >
          <TaskItemAction
            onResume={onResume}
            onStop={onStop}
            gid={task.gid}
            status={status}
            onCopyLink={onCopyLink}
            onOpenFile={onOpenFile}
            onPause={onPause}
            onShowInfo={() => setOpenInfo(true)}
          />
        </Box>
      </ListItemButton>

      <LinearProgress
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          marginInline: 2,
          borderRadius: 4,
        }}
        variant="determinate"
        color={progressColor}
        value={progress}
      />

      <TaskDetailsDrawer
        open={openInfo}
        task={task}
        onClose={onClose}
        onCopyLink={onCopyLink}
        onOpenFile={onOpenFile}
        onPause={onPause}
        onResume={onResume}
        onStop={onStop}
      />
    </ListItem>
  );
}

export default TaskItem;
