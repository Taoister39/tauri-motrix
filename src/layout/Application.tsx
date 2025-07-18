import { Menu as MenuIcon } from "@mui/icons-material";
import {
  boxClasses,
  Drawer,
  drawerClasses,
  IconButton,
  List,
  Paper,
  styled,
  SvgIcon,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { emit, listen } from "@tauri-apps/api/event";
import { useBoolean, useMount } from "ahooks";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRoutes } from "react-router-dom";
import { SWRConfig } from "swr";

import logoIcon from "@/assets/logo.svg?react";
import AddTaskDialog from "@/business/task/AddTaskDialog";
import UpdateButton from "@/business/update/UpdateButton";
import { DialogRef } from "@/components/BaseDialog";
import { isWin } from "@/constant/environment";
import { ADD_DIALOG } from "@/constant/url";
import { useMotrix } from "@/hooks/motrix";
import { useCustomTheme } from "@/hooks/theme";
import LayoutItem from "@/layout/LayoutItem";
import LayoutTraffic from "@/layout/LayoutTraffic";
import TitleBar from "@/layout/TitleBar";
import { routers } from "@/routes/application";
import { usePollingStore } from "@/store/polling";
import { useTaskStore } from "@/store/task";

const TheLogo = styled("section")(() => ({
  display: "flex",
  flex: "0 0 58px",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
  ".the-newbtn": {
    position: "absolute",
    right: "10px",
    top: "7px",
    borderRadius: "8px",
    padding: "2px 4px",
    transform: "scale(0.8)",
  },
}));

const TheMenu = styled(List)(() => ({
  flex: "1 1 80%",
}));

const TheTraffic = styled("section")(() => ({
  flex: "0 0 60px",
  "& > *": {
    paddingInline: "20px",
  },
  paddingBottom: "8px",
}));

const Main = styled("main")(() => ({
  overflow: "hidden",
}));

function Application() {
  const { t, i18n } = useTranslation();
  const { theme } = useCustomTheme();
  const { motrix } = useMotrix();
  const { registerEvent, syncByMotrix } = useTaskStore();
  const { polling, stop } = usePollingStore();
  const addRef = useRef<DialogRef>(null);

  const routerElements = useRoutes(routers);

  useEffect(() => {
    const unlisten = listen(ADD_DIALOG, () => {
      addRef.current?.open();
    });

    return () => {
      unlisten.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    if (motrix) {
      syncByMotrix(motrix);
    }
  }, [motrix, syncByMotrix]);

  useEffect(() => {
    if (motrix?.language) {
      i18n.changeLanguage(motrix.language);
    }
  }, [i18n, motrix?.language]);

  useEffect(() => {
    polling();

    return () => {
      stop();
    };
  }, [polling, stop]);

  useMount(() => {
    registerEvent();
    emit("motrix://web-ready");
  });

  const [
    isOpenAside,
    { toggle: toggleOpenAside, setFalse: setFalseOpenAside },
  ] = useBoolean(false);

  const isDownSm = useMediaQuery(theme.breakpoints.down("sm"));

  if (!routerElements) {
    return null;
  }

  return (
    <SWRConfig value={{ errorRetryCount: 3 }}>
      <ThemeProvider theme={theme}>
        <AddTaskDialog ref={addRef} />
        <Paper
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          sx={({ palette }) => ({
            bgcolor: palette.background.paper,
            height: "100vh",
            display: "grid",
            gridTemplateRows: "auto 1fr",
            gridAutoColumns: "auto 1fr",
            [`& > .${boxClasses.root}`]: {
              gridColumn: "1 / 3",
              gridRow: "1",
            },
            [`& > .${drawerClasses.root}`]: {
              gridColumn: "1",
              gridRow: "2",
            },
            [`& > main`]: {
              gridColumn: "2",
              gridRow: "2",
            },
          })}
        >
          {isWin && <TitleBar toggleOpenAside={toggleOpenAside} />}

          <Drawer
            sx={(theme) => ({
              [`.${drawerClasses.paper}`]: {
                position: "unset",
                width: "200px",
                display: "flex",
                flexDirection: "column",
                backgroundColor: theme.palette.background.paper,
                border: "none",
              },
            })}
            open={!isDownSm ? true : isOpenAside}
            onClose={setFalseOpenAside}
            variant={isDownSm ? "temporary" : "permanent"}
          >
            <IconButton
              onClick={toggleOpenAside}
              color="inherit"
              aria-label="open aside menu"
              edge="end"
              size="large"
              sx={[
                {
                  marginLeft: 1,
                  cursor: "pointer",
                  alignSelf: "start",
                },
                !isDownSm && { display: "none" },
              ]}
            >
              <MenuIcon />
            </IconButton>

            <TheLogo data-tauri-drag-region>
              <SvgIcon sx={{ width: 62 }} component={logoIcon} inheritViewBox />
              <UpdateButton className="the-newbtn" />
            </TheLogo>

            <TheMenu>
              {routers.map(
                (router) =>
                  router.path &&
                  router.label && (
                    <LayoutItem
                      icon={router.icon}
                      to={router.path}
                      key={router.label}
                    >
                      {t(router.label)}
                    </LayoutItem>
                  ),
              )}
            </TheMenu>

            <TheTraffic>
              <LayoutTraffic />
            </TheTraffic>
          </Drawer>

          <Main>{routerElements}</Main>
        </Paper>
      </ThemeProvider>
    </SWRConfig>
  );
}

export default Application;
