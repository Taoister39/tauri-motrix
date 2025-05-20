import {
  DeleteOutline,
  FileOpenOutlined,
  LinkOutlined,
} from "@mui/icons-material";
import {
  Box,
  Checkbox,
  Chip,
  ListItem,
  ListItemButton,
  ListItemIcon,
  listItemIconClasses,
  ListItemText,
} from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";

import { TaskActionButton } from "@/client/task_compose";
import { Notice } from "@/components/Notice";
import { DownloadHistory } from "@/services/download_history";

export interface HistoryItemProps {
  checked?: boolean;
  history: DownloadHistory;
  onDelete: (id: DownloadHistory["id"]) => void;
  onSelect: (id: DownloadHistory["id"]) => void;
}

function HistoryItem({
  history,
  onDelete,
  checked,
  onSelect,
}: HistoryItemProps) {
  const { engine, id, link, name, path } = history;

  const { t } = useTranslation();

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
        onClick={() => onSelect(id)}
      >
        <ListItemIcon>
          <Checkbox
            edge="start"
            checked={checked}
            onChange={() => onSelect(id)}
          />
        </ListItemIcon>
        <ListItemText
          primary={name}
          slots={{
            secondary: "div",
          }}
          secondary={
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "4px",
              }}
            >
              <Chip
                label={engine}
                size="small"
                variant="outlined"
                color="primary"
              />
              <Chip label={path} size="small" variant="outlined" />
            </Box>
          }
        />

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <TaskActionButton
            icon={<LinkOutlined />}
            onClick={() => writeText(link)}
          />
          <TaskActionButton
            title={t("task.OpenFile")}
            icon={<FileOpenOutlined />}
            onClick={() => revealItemInDir(path).catch((e) => Notice.error(e))}
          />
          <TaskActionButton
            icon={<DeleteOutline />}
            onClick={() => onDelete(id)}
          />
        </Box>
      </ListItemButton>
    </ListItem>
  );
}

export default HistoryItem;
