import {
  DeleteOutline,
  FileOpenOutlined,
  Folder,
  LinkOutlined,
} from "@mui/icons-material";
import {
  alpha,
  ListItem,
  ListItemButton,
  ListItemIcon,
  listItemIconClasses,
  ListItemText,
  Menu,
  MenuItem,
  MenuProps,
  styled,
  typographyClasses,
} from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import dayjs from "dayjs";
import { MouseEventHandler, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { TaskActionButton } from "@/client/task_compose";
import { Notice } from "@/components/Notice";
import { DownloadHistoryVO } from "@/services/download_history";
import { parseByteVo } from "@/utils/download";

export interface HistoryItemProps {
  history: DownloadHistoryVO;
  onDelete: (id: DownloadHistoryVO["id"]) => void;
}

const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "right",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "right",
    }}
    {...props}
  />
))(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color: "rgb(55, 65, 81)",
    boxShadow:
      "rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
    "& .MuiMenu-list": {
      padding: "4px 0",
    },
    "& .MuiMenuItem-root": {
      "& .MuiSvgIcon-root": {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      "&:active": {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
    ...theme.applyStyles("dark", {
      color: theme.palette.grey[300],
    }),
  },
}));

function HistoryItem({ history, onDelete }: HistoryItemProps) {
  const { engine, id, link, name, path, downloaded_at, total_length } = history;

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

      <StyledMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
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
      </StyledMenu>
    </ListItem>
  );
}

export default HistoryItem;
