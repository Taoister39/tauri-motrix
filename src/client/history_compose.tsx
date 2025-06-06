import { DeleteOutline, StarOutline } from "@mui/icons-material";
import {
  alpha,
  ListItemButton,
  ListItemText,
  Menu,
  MenuProps,
  styled,
} from "@mui/material";

import { TaskActionButton } from "@/client/task_compose";

export function HistoryDirItem(props: {
  dir: string;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onStar: (id: number) => void;
  id: number;
  is_star: boolean;
}) {
  const { dir, id, is_star, onDelete, onSelect, onStar } = props;
  return (
    <ListItemButton onClick={() => onSelect(id)}>
      <ListItemText primary={dir} />
      <TaskActionButton
        onClick={() => onStar(id)}
        icon={<StarOutline htmlColor={is_star ? "#E6A23C" : undefined} />}
      />
      {!is_star && (
        <TaskActionButton
          onClick={() => onDelete(id)}
          icon={<DeleteOutline />}
        />
      )}
    </ListItemButton>
  );
}

export const HistoryStyledMenu = styled((props: MenuProps) => (
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
