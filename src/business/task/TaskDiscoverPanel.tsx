import { List, ListItemText } from "@mui/material";
import { useMemo } from "react";

import { BaseEmpty } from "@/components/BaseEmpty";

export interface TaskDiscoverPanelProps {
  announceList: Array<[string]>;
}

function TaskDiscoverPanel({ announceList }: TaskDiscoverPanelProps) {
  const data = useMemo(
    () => announceList.map((item) => item[0]) || [],
    [announceList],
  );

  if (!data.length) {
    return <BaseEmpty />;
  }

  return (
    <List>
      {data.map((item) => (
        <ListItemText primary={item} key={item} />
      ))}
    </List>
  );
}

export default TaskDiscoverPanel;
