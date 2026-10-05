import { Divider } from "@mui/material";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { TaskDrawerItem, TaskDrawerList } from "@/client/task_compose";
import { DownloadTask } from "@/services/download";
import { parseByteVo } from "@/utils/download";
import { checkTaskIsBT, getTaskName } from "@/utils/task";

export interface TaskInfoPanelProps {
  task: DownloadTask;
}

function TaskInfoPanel({ task }: TaskInfoPanelProps) {
  const { t } = useTranslation();
  const taskName = getTaskName(task);

  const isBt = checkTaskIsBT(task);

  const bittorrent = task.bittorrent;

  return (
    <TaskDrawerList>
      <TaskDrawerItem label="GID" value={task.gid} />
      <TaskDrawerItem
        label={t("vortex.Engine")}
        value={task.ref?.engine ?? "aria2c"}
      />
      <TaskDrawerItem label={t("task.TaskName")} value={taskName} />
      <TaskDrawerItem label={t("task.SaveTo")} value={task.dir} />
      <TaskDrawerItem label={t("task.Status")} value={task.status} />
      {task.errorMessage && (
        <TaskDrawerItem
          label={task.errorCode ?? t("task.Status")}
          value={task.errorMessage}
        />
      )}

      {isBt && (
        <>
          <Divider>Torrent Info</Divider>
          <TaskDrawerItem label="Hash" value={task.infoHash ?? "unkown"} />
          <TaskDrawerItem
            label={t("common.PieceSize")}
            value={parseByteVo(task.pieceLength).join("")}
          />
          <TaskDrawerItem label={t("common.Pieces")} value={task.pieceLength} />
          <TaskDrawerItem
            label={t("common.CreationDate")}
            value={
              bittorrent?.creationDate
                ? dayjs
                    .unix(Number(bittorrent.creationDate))
                    .format("YYYY-MM-DD HH:mm:ss")
                : ""
            }
          />
          <TaskDrawerItem label="Comment" value={task.bittorrent!.comment} />
        </>
      )}
    </TaskDrawerList>
  );
}

export default TaskInfoPanel;
