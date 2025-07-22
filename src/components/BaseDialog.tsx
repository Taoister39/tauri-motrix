import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  type SxProps,
  type Theme,
} from "@mui/material";
import { FormEvent, ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

// original code from clash verge

export interface BaseDialogProps {
  title: ReactNode;
  open: boolean;
  okBtn?: ReactNode;
  cancelBtn?: ReactNode;
  disableOk?: boolean;
  disableCancel?: boolean;
  disableFooter?: boolean;
  contentSx?: SxProps<Theme>;
  children?: ReactNode;
  loading?: boolean;
  onOk?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  onSubmit?: (e: FormEvent) => void;
  enableForm?: boolean;
  fullWidth?: boolean;
  maxWidth?: DialogProps["maxWidth"];
}

export interface DialogRef {
  open: () => void;
  close: () => void;
}

export function BaseDialog(props: BaseDialogProps) {
  const { t } = useTranslation();
  const {
    open,
    title,
    children,
    okBtn,
    cancelBtn,
    contentSx,
    disableCancel,
    disableOk,
    disableFooter,
    loading,
    onClose,
    onCancel,
    onOk,
    onSubmit,
    enableForm,
    fullWidth,
    maxWidth,
  } = props;

  const rootSlotProps = useMemo<DialogProps["slotProps"]>(
    () =>
      enableForm
        ? {
            paper: {
              component: "form",
              onSubmit,
            },
          }
        : undefined,
    [onSubmit, enableForm],
  );

  const handleOkBtnSubmit = useMemo(
    () => (enableForm ? undefined : onOk),
    [onOk, enableForm],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={rootSlotProps}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
    >
      <DialogTitle>{title}</DialogTitle>

      <DialogContent sx={contentSx}>{children}</DialogContent>

      {!disableFooter && (
        <DialogActions>
          {!disableCancel && (
            <Button variant="outlined" onClick={onCancel}>
              {cancelBtn || t("common.Cancel")}
            </Button>
          )}
          {!disableOk && (
            <Button
              loading={loading}
              variant="contained"
              onClick={handleOkBtnSubmit}
              type={enableForm ? "submit" : "button"}
            >
              {okBtn || t("common.Ok")}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}

export default BaseDialog;
