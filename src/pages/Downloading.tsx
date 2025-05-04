import { emit } from "@tauri-apps/api/event";
import { useMount } from "ahooks";
import { useTranslation } from "react-i18next";

import TaskAllAction from "@/business/task/TaskAllAction";
import TaskItem from "@/business/task/TaskItem";
import { TaskFab, TaskList } from "@/client/task_compose";
import BasePage from "@/components/BasePage";
import { TASK_STATUS_ENUM } from "@/constant/task";
import { ADD_DIALOG } from "@/constant/url";
import { useTaskStore } from "@/store/task";

function DownloadingPage() {
  const { t } = useTranslation();

  const {
    tasks,
    selectedTaskIds,
    fetchType,
    handleTaskSelect,
    handleTaskPause,
    handleTaskResume,
    handleTaskDelete: handleTaskStop,
    openTaskFile,
    copyTaskLink,
    setFetchType,
  } = useTaskStore();

  useMount(() => {
    setFetchType(TASK_STATUS_ENUM.Active);
  });

  return (
    <BasePage
      title={t("Task-Start")}
      header={
        <TaskAllAction
          onPause={handleTaskPause}
          onResume={handleTaskResume}
          onStop={handleTaskStop}
          selectedTaskIds={selectedTaskIds}
          fetchType={fetchType}
        />
      }
      fab={<TaskFab onClick={() => emit(ADD_DIALOG)} />}
    >
      <TaskList
        dataSource={tasks}
        renderItem={(task) => (
          <TaskItem
            onCopyLink={copyTaskLink}
            onStop={handleTaskStop}
            onResume={handleTaskResume}
            onPause={handleTaskPause}
            onOpenFile={openTaskFile}
            key={task.gid}
            task={task}
            onSelect={handleTaskSelect}
            selected={selectedTaskIds.includes(task.gid)}
          />
        )}
      />
    </BasePage>
  );
}

export default DownloadingPage;
