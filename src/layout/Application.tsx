import {
  boxClasses,
  List,
  Paper,
  styled,
  SvgIcon,
  ThemeProvider,
} from "@mui/material";
import { emit, listen } from "@tauri-apps/api/event";
import { useMount } from "ahooks";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRoutes } from "react-router-dom";
import { SWRConfig } from "swr";

import logoIcon from "@/assets/logo.svg?react";
import AddTaskDialog from "@/business/task/AddTaskDialog";
import { DialogRef } from "@/components/BaseDialog";
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
}));

const TheMenu = styled(List)(() => ({
  flex: "1 1 80%",
}));

const TheTraffic = styled("section")(() => ({
  flex: "0 0 60px",
  "& > *": {
    paddingInline: "20px",
  },
}));

const Main = styled("main")(() => ({
  overflow: "hidden",
}));

const Aside = styled("aside")(({ theme }) => ({
  width: "200px",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
}));

function Application() {
  const { t, i18n } = useTranslation();
  const { theme } = useCustomTheme();
  const { motrix } = useMotrix();
  const { registerEvent } = useTaskStore();
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
            [`& > aside`]: {
              gridColumn: "1",
              gridRow: "2",
            },
            [`& > main`]: {
              gridColumn: "2",
              gridRow: "2",
            },
          })}
        >
          <TitleBar />

          <Aside>
            <TheLogo data-tauri-drag-region>
              <SvgIcon sx={{ width: 62 }} component={logoIcon} inheritViewBox />
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
          </Aside>

          <Main>{routerElements}</Main>
        </Paper>
      </ThemeProvider>
    </SWRConfig>
  );
}

export default Application;
