import {
  CloseRounded,
  CropSquareRounded,
  FilterNoneRounded,
  HorizontalRuleRounded,
  Menu as MenuIcon,
  PushPinOutlined,
  PushPinRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  ButtonGroup,
  buttonGroupClasses,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

const appWindow = getCurrentWindow();

export interface TitleBarProps {
  toggleOpenAside: () => void;
}

function TitleBar({ toggleOpenAside }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPined, setIsPined] = useState(false);

  const theme = useTheme();

  const isDownSm = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    appWindow.isMaximized().then(setIsMaximized);

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <Box
      sx={({ palette }) => ({
        background: palette.background.paper,
        display: "flex",
        alignItems: "center",
        appRegion: "drag",
      })}
      data-tauri-drag-region
    >
      <IconButton
        onClick={toggleOpenAside}
        color="inherit"
        aria-label="open aside menu"
        edge="end"
        size="small"
        sx={[
          {
            marginLeft: 1,
            cursor: "pointer",
          },
          !isDownSm && { display: "none" },
        ]}
      >
        <MenuIcon />
      </IconButton>

      <ButtonGroup
        variant="text"
        sx={{
          [`.${buttonGroupClasses.grouped}`]: {
            borderRight: "0px",
            borderRadius: "0px",
          },
          marginLeft: "auto",
        }}
      >
        <Button
          size="small"
          onClick={() => {
            appWindow.setAlwaysOnTop(!isPined);
            setIsPined((isPined) => !isPined);
          }}
        >
          {isPined ? (
            <PushPinRounded fontSize="small" />
          ) : (
            <PushPinOutlined fontSize="small" />
          )}
        </Button>

        <Button size="small" onClick={() => appWindow.minimize()}>
          <HorizontalRuleRounded fontSize="small" />
        </Button>

        <Button
          size="small"
          onClick={() => {
            setIsMaximized((isMaximized) => !isMaximized);
            appWindow.toggleMaximize();
          }}
        >
          {isMaximized ? (
            <FilterNoneRounded
              sx={{ transform: "rotate(180deg) scale(0.7)" }}
              fontSize="small"
            />
          ) : (
            <CropSquareRounded fontSize="small" />
          )}
        </Button>

        <Button
          size="small"
          onClick={() => appWindow.close()}
          sx={{
            ":hover": { bgcolor: "#ff000090" },
            ":hover > svg": { color: "white" },
          }}
        >
          <CloseRounded fontSize="small" />
        </Button>
      </ButtonGroup>
    </Box>
  );
}

export default TitleBar;
