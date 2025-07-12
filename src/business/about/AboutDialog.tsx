import { Box, Typography, typographyClasses } from "@mui/material";
import { version as appVersion } from "@root/package.json";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";

import Copyright from "@/business/about/Copyright";
import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import { useAria2 } from "@/hooks/aria2";

function AboutDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setFalse, setTrue }] = useBoolean();

  const { version, enabledFeatures } = useAria2();

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: setFalse,
  }));

  return (
    <BaseDialog
      disableCancel
      title={t("about.Title")}
      open={open}
      onClose={setFalse}
      onOk={setFalse}
      okBtn={t("common.Ok")}
    >
      <Typography variant="subtitle1">motrix version v{appVersion}</Typography>
      <Typography variant="subtitle1">aria2 version v{version}</Typography>

      <Box
        sx={{
          [`& .${typographyClasses.root}`]: {
            fontSize: "14px",
            width: "50%",
          },
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {enabledFeatures?.map((feature) => (
          <Typography key={feature} variant="body2">
            {feature}
          </Typography>
        ))}
      </Box>

      <Copyright />
    </BaseDialog>
  );
}

export default AboutDialog;
