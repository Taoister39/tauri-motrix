import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  type SxProps,
  type Theme,
  useMediaQuery,
} from "@mui/material";
import { FormEvent, ReactNode, useId, useMemo } from "react";
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
  actions?: ReactNode;
  descriptionId?: string;
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
    actions,
    descriptionId,
  } = props;
  const titleId = useId();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

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
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      transitionDuration={reduceMotion ? 0 : undefined}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>

      <DialogContent sx={contentSx}>{children}</DialogContent>

      {!disableFooter && (
        <DialogActions>
          {actions ?? (
            <>
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
            </>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}

export default BaseDialog;
