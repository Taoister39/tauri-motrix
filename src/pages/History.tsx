import { useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import HistoryItem from "@/business/history/HistoryItem";
import { TaskList } from "@/client/task_compose";
import BasePage from "@/components/BasePage";
import { deleteHistory, findManyHistory } from "@/services/download_history";
import { arrayAddOrRemove } from "@/utils/array_add_or_remove";

function HistoryPage() {
  const { t } = useTranslation();

  const { data: downloadHistoryList = [], mutate: mutateDownloadHistoryList } =
    useSWR("getDownloadHistory", findManyHistory);

  const [selectedIdList, setSelectedIdList] = useState<number[]>([]);

  const handleDelete = async (id: number) => {
    await deleteHistory(id);
    mutateDownloadHistoryList();
  };

  const handleSelect = (id: number) => {
    setSelectedIdList(arrayAddOrRemove(selectedIdList, id));
  };

  return (
    <BasePage title={t("Task-History")}>
      <TaskList
        emptyText="history.Empty"
        dataSource={downloadHistoryList}
        renderItem={(item) => (
          <HistoryItem
            onSelect={handleSelect}
            key={item.id}
            history={item}
            onDelete={handleDelete}
            checked={selectedIdList.includes(item.id)}
          />
        )}
      />
    </BasePage>
  );
}

export default HistoryPage;
