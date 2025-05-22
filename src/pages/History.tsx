import { useTranslation } from "react-i18next";
import useSWR from "swr";

import HistoryItem from "@/business/history/HistoryItem";
import { TaskList } from "@/client/task_compose";
import BasePage from "@/components/BasePage";
import { deleteHistory, findManyHistory } from "@/services/download_history";

function HistoryPage() {
  const { t } = useTranslation();

  const { data: downloadHistoryList = [], mutate: mutateDownloadHistoryList } =
    useSWR("getDownloadHistory", findManyHistory);

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
          <HistoryItem key={item.id} history={item} onDelete={handleDelete} />
        )}
      />
    </BasePage>
  );
}

export default HistoryPage;
