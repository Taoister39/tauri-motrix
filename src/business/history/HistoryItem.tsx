import {
  DeleteOutline,
  FileOpenOutlined,
  LinkOutlined,
} from "@mui/icons-material";
import { Box, ListItem, ListItemText, Typography } from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { HistoryThumbnail } from "@/business/history/HistoryThumbnail";
import { TaskActionButton } from "@/client/task_compose";
import { Notice } from "@/components/Notice";
import type { DownloadHistoryVO } from "@/services/download_history";
import type { HistoryFileInspection } from "@/services/history_files";
import { parseByteVo } from "@/utils/download";

export interface HistoryItemProps {
  history: DownloadHistoryVO;
  file?: HistoryFileInspection;
  onDelete: (id: DownloadHistoryVO["id"]) => void;
}

function HistoryItem({ history, file, onDelete }: HistoryItemProps) {
  const { engine, id, link, name, path, created_at, total_length } = history;
  const { t } = useTranslation();
  const missing = file?.state === "missing";
  const description = `${engine} ${parseByteVo(total_length).join("")} ${dayjs.unix(created_at).format("YYYY-MM-DD HH:mm:ss")}`;

  return (
    <ListItem
      sx={{
        bgcolor: "background.paper",
        borderRadius: "8px",
        minHeight: 72,
        gap: 1.5,
        px: 1.5,
      }}
    >
      <HistoryThumbnail path={path} file={file} />
      <ListItemText
        sx={{ minWidth: 0 }}
        disableTypography
        primary={
          <Typography
            noWrap
            title={missing ? `${name} — ${t("history.FileMissing")}` : name}
            aria-label={
              missing ? `${name} — ${t("history.FileMissing")}` : undefined
            }
            sx={{
              textDecoration: missing ? "line-through" : undefined,
              color: missing ? "text.secondary" : "text.primary",
            }}
          >
            {name}
          </Typography>
        }
        secondary={
          <Typography variant="body2" color="text.secondary" noWrap>
            {description}
          </Typography>
        }
      />
      <Box sx={{ display: "flex", flexShrink: 0 }}>
        <TaskActionButton
          title={t("history.RevealFile")}
          icon={<FileOpenOutlined />}
          disabled={missing}
          onClick={() =>
            void revealItemInDir(path).catch((error) => Notice.error(error))
          }
        />
        <TaskActionButton
          title={t("task.CopyLink")}
          icon={<LinkOutlined />}
          onClick={() =>
            void writeText(link).catch((error) => Notice.error(error))
          }
        />
        <TaskActionButton
          title={t("task.Delete")}
          icon={<DeleteOutline />}
          onClick={() => onDelete(id)}
        />
      </Box>
    </ListItem>
  );
}

export default HistoryItem;
