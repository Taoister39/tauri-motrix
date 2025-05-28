import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import TaskGraphic from "@/business/task/TaskGraphic";
import { TaskDrawerItem, TaskDrawerList } from "@/client/task_compose";
import LinearProgressWithLabel from "@/components/LinearProgressWithLabel";
import { Aria2Task } from "@/services/aria2c_api";
import { parseByteVo } from "@/utils/download";
import { getTaskProgressColor } from "@/utils/task";

export interface TaskSpeedPanelProps {
  task: Aria2Task;
}

function TaskSpeedPanel({ task }: TaskSpeedPanelProps) {
  const { status, bitfield } = task;
  const totalLength = Number(task.totalLength) || 0;
  const completedLength = Number(task.completedLength) || 0;
  const progress = (completedLength / totalLength) * 100 || 0;

  const completed = parseByteVo(completedLength).join("");
  const total = parseByteVo(totalLength).join("");
  const progressText = `${completed} / ${total}`;

  const speedVo = parseByteVo(task.downloadSpeed, "/s").join("");

  const { t } = useTranslation();

  const progressColor = useMemo(
    () => getTaskProgressColor(progress, status),
    [progress, status],
  );

  return (
    <TaskDrawerList title={t("task.SpeedDetails")}>
      <LinearProgressWithLabel value={progress} color={progressColor} />

      <TaskDrawerItem label="Progress" value={progressText} />
      <TaskDrawerItem label="Connections" value={task.connections} />
      <TaskDrawerItem label="Download Speed" value={speedVo} />

      {bitfield && <TaskGraphic bitfield={bitfield} outerWidth={400} />}
    </TaskDrawerList>
  );
}

export default TaskSpeedPanel;
