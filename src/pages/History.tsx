import { useTranslation } from "react-i18next";
import useSWR from "swr";

import HistoryItem from "@/business/history/HistoryItem";
import { TaskList } from "@/client/task_compose";
import BasePage from "@/components/BasePage";
import { useHistoryFiles } from "@/hooks/history_files";
import type { DownloadHistoryVO } from "@/services/download_history";
import { deleteHistory, findManyHistory } from "@/services/download_history";

const EMPTY_HISTORY: DownloadHistoryVO[] = [];

function HistoryPage() {
  const { t } = useTranslation();

  const {
    data: downloadHistoryList = EMPTY_HISTORY,
    mutate: mutateDownloadHistoryList,
  } = useSWR("getDownloadHistory", findManyHistory);
  const files = useHistoryFiles(downloadHistoryList);

  const handleDelete = async (id: number) => {
    await deleteHistory(id);
    mutateDownloadHistoryList();
  };

  return (
    <BasePage title={t("Task-History")}>
      <TaskList
        emptyText="history.Empty"
        dataSource={downloadHistoryList}
        renderItem={(item) => (
          <HistoryItem
            key={item.id}
            history={item}
            file={files.get(item.path)}
            onDelete={handleDelete}
          />
        )}
      />
    </BasePage>
  );
}

export default HistoryPage;
