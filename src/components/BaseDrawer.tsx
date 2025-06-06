import { Close } from "@mui/icons-material";
import {
  Box,
  Drawer,
  DrawerProps,
  IconButton,
  styled,
  SxProps,
  Theme,
  Typography,
} from "@mui/material";
import { ReactNode } from "react";

const TheContainer = styled(Box)(
  ({
    theme: {
      palette: { mode },
    },
  }) => ({
    height: "100%",
    padding: "16px",
    backgroundColor: mode === "dark" ? "#1e1e1e" : "#f5f5f5",
    color: mode === "dark" ? "#fff" : "#000",
    display: "flex",
    flexDirection: "column",
  }),
);

export interface BaseDrawerProps {
  title: ReactNode;
  open: boolean;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  children?: ReactNode;
  action?: ReactNode;
  anchor?: DrawerProps["anchor"];
  onClose?: () => void;
  header?: ReactNode;
}

function BaseDrawer(props: BaseDrawerProps) {
  const {
    open,
    contentSx,
    anchor,
    sx,
    children,
    title,
    action,
    onClose,
    header,
  } = props;

  return (
    <Drawer anchor={anchor} sx={sx} open={open} onClose={onClose}>
      <TheContainer sx={contentSx}>
        <Box
          id="base-drawer-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="h6"
            sx={({ palette: { mode } }) => ({
              color: mode === "dark" ? "#bb86fc" : "#333",
              fontWeight: "700",
            })}
          >
            {title}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        <Box id="base-drawer-header">{header}</Box>

        <Box
          id="base-drawer-content"
          sx={{
            flex: "1 1 1px",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          {children}
        </Box>

        <Box
          id="base-drawer-action"
          style={{
            textAlign: "center",
          }}
        >
          {action}
        </Box>
      </TheContainer>
    </Drawer>
  );
}

export default BaseDrawer;
