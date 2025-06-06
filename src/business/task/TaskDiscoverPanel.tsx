import { List, ListItemText } from "@mui/material";
import { useMemo } from "react";

export interface TaskDiscoverPanelProps {
  announceList: Array<[string]>;
}

function TaskDiscoverPanel({ announceList }: TaskDiscoverPanelProps) {
  const data = useMemo(
    () => announceList.map((item) => item[0]) || [],
    [announceList],
  );

  return (
    <List>
      {data.map((item) => (
        <ListItemText primary={item} key={item} />
      ))}
    </List>
  );
}

export default TaskDiscoverPanel;
