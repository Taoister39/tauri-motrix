import { GitHub, HelpOutlineRounded } from "@mui/icons-material";
import {
  Box,
  boxClasses,
  ButtonGroup,
  Grid,
  gridClasses,
  IconButton,
} from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useLockFn } from "ahooks";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import AboutDialog from "@/business/about/AboutDialog";
import Aria2Setting from "@/business/setting/Aria2Setting";
import AppearanceSetting from "@/business/setting/DisplaySetting";
import MotrixSetting from "@/business/setting/MotrixSetting";
import { DialogRef } from "@/components/BaseDialog";
import BasePage from "@/components/BasePage";
import { APP_REPO } from "@/constant/url";
import { useIsDark } from "@/hooks/theme";

function SettingsPage() {
  const { t } = useTranslation();

  const isDark = useIsDark();

  const toGithubRepo = useLockFn(() => openUrl(APP_REPO));

  const aboutRef = useRef<DialogRef>(null);

  return (
    <BasePage
      title={t("Settings")}
      header={
        <ButtonGroup>
          <AboutDialog ref={aboutRef} />

          <IconButton
            size="medium"
            color="inherit"
            title={t("Manual")}
            onClick={() => aboutRef.current?.open()}
          >
            <HelpOutlineRounded fontSize="inherit" />
          </IconButton>
          <IconButton
            size="medium"
            color="inherit"
            title={t("Github Repo")}
            onClick={toGithubRepo}
          >
            <GitHub fontSize="inherit" />
          </IconButton>
        </ButtonGroup>
      }
    >
      <Grid
        container
        spacing={1.5}
        sx={{
          [`.${gridClasses.root} > .${boxClasses.root}`]: {
            borderRadius: 2,
            marginBottom: 1.5,
            backgroundColor: isDark ? "#282a36" : "#ffffff",
          },
        }}
        columns={{ xs: 6, sm: 6, md: 12 }}
      >
        <Grid size={6}>
          <Box>
            <AppearanceSetting />
          </Box>
          <Box>
            <Aria2Setting />
          </Box>
        </Grid>

        <Grid size={6}>
          <Box>
            <MotrixSetting />
          </Box>
        </Grid>
      </Grid>
    </BasePage>
  );
}

export default SettingsPage;
