import { Box, Link, Typography } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { BaseCopyright } from "@tauri-motrix/ux-base";
import { Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";

function Copyright() {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 2,
      }}
    >
      <Typography>
        <BaseCopyright component={Fragment} />
      </Typography>

      <Link
        component="button"
        onClick={() =>
          openUrl(
            "https://raw.githubusercontent.com/Taoister39/tauri-motrix/refs/heads/main/LICENSE",
          )
        }
      >
        {t("about.License")}
      </Link>
      {/* <a target="_blank" rel="noopener noreferrer">
        {t("about.support")}
      </a>
      <a target="_blank" rel="noopener noreferrer">
        {t("about.release")}
      </a> */}
    </Box>
  );
}

export default Copyright;
