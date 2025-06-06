import { Box, Button, Grow } from "@mui/material";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface ConfirmPanelProps {
  children: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  okBtn?: ReactNode;
  cancelBtn?: ReactNode;
  loading?: boolean;
  hide?: boolean;
}

function ConfirmPanel({
  children,
  onCancel,
  cancelBtn,
  okBtn,
  loading,
  onOk,
  hide,
}: ConfirmPanelProps) {
  const { t } = useTranslation();

  okBtn ??= t("common.Save");
  cancelBtn ??= t("common.Cancel");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>{children}</Box>

      <Grow in={!hide}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={onCancel}>
            {cancelBtn}
          </Button>

          <Button loading={loading} variant="contained" onClick={onOk}>
            {okBtn}
          </Button>
        </Box>
      </Grow>
    </Box>
  );
}

export default ConfirmPanel;
