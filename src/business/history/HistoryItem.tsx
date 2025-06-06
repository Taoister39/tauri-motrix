import {
  DeleteOutline,
  FileOpenOutlined,
  Folder,
  LinkOutlined,
} from "@mui/icons-material";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  listItemIconClasses,
  ListItemText,
  MenuItem,
  typographyClasses,
} from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import dayjs from "dayjs";
import { MouseEventHandler, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { HistoryStyledMenu } from "@/client/history_compose";
import { TaskActionButton } from "@/client/task_compose";
import { Notice } from "@/components/Notice";
import { DownloadHistoryVO } from "@/services/download_history";
import { parseByteVo } from "@/utils/download";

export interface HistoryItemProps {
  history: DownloadHistoryVO;
  onDelete: (id: DownloadHistoryVO["id"]) => void;
}

function HistoryItem({ history, onDelete }: HistoryItemProps) {
  const {
    engine,
    id,
    link,
    name,
    path,
    created_at: downloaded_at,
    total_length,
  } = history;

  const { t } = useTranslation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const describe = useMemo(
    () =>
      `${engine} ${parseByteVo(total_length).join("")} ${dayjs.unix(downloaded_at).format("YYYY-MM-DD HH:mm:ss")}`,
    [engine, downloaded_at, total_length],
  );

  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <TaskActionButton
          icon={<DeleteOutline />}
          onClick={() => onDelete(id)}
        />
      }
    >
      <ListItemButton
        sx={({ palette }) => ({
          bgcolor: palette.background.paper,
          ":hover": { bgcolor: palette.background.paper },
          borderRadius: "8px",
          [`& .${listItemIconClasses.root}`]: {
            minWidth: "40px",
          },
        })}
        onClick={handleClick}
      >
        <ListItemIcon>
          <Folder />
        </ListItemIcon>
        <ListItemText
          sx={{
            display: "table",
            tableLayout: "fixed",
            width: "100%",
            [`& .${typographyClasses.body1}`]: {
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            },
          }}
          primary={name}
          secondary={describe}
        />
      </ListItemButton>

      <HistoryStyledMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem
          onClick={() => writeText(link).then(handleClose)}
          disableRipple
        >
          <LinkOutlined />
          {t("task.CopyLink")}
        </MenuItem>
        <MenuItem
          onClick={() =>
            revealItemInDir(path)
              .then(handleClose)
              .catch((e) => Notice.error(e))
          }
          disableRipple
        >
          <FileOpenOutlined />
          {t("task.OpenFile")}
        </MenuItem>
      </HistoryStyledMenu>
    </ListItem>
  );
}

export default HistoryItem;
