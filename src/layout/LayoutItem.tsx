import {
  alpha,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { ReactNode } from "react";
import { useMatch, useNavigate, useResolvedPath } from "react-router";

interface LayoutItemProps {
  children: string;
  to: string;
  icon: ReactNode;
}
function LayoutItem({ children, icon, to }: LayoutItemProps) {
  const navigate = useNavigate();

  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });

  return (
    <ListItem sx={{ py: "4px" }} disablePadding>
      <ListItemButton
        sx={({ palette }) => ({
          borderRadius: 2,
          marginInline: 1.25,
          paddingInline: 1,
          "& .MuiListItemText-primary": {
            color: palette.text.primary,
            fontWeight: "700",
          },
          "&.Mui-selected .MuiListItemText-primary": {
            color: palette.mode === "light" ? "#1f1f1f" : "#ffffff",
          },
          "&.Mui-selected": {
            bgcolor:
              palette.mode === "light"
                ? alpha(palette.primary.main, 0.15)
                : alpha(palette.primary.main, 0.35),
          },
          "&.Mui-selected:hover": {
            bgcolor:
              palette.mode === "light"
                ? alpha(palette.primary.main, 0.15)
                : alpha(palette.primary.main, 0.35),
          },
        })}
        selected={!!match}
        onClick={() => {
          navigate(to);
        }}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText>{children}</ListItemText>
      </ListItemButton>
    </ListItem>
  );
}

export default LayoutItem;
