import { ContentCopy, Visibility, VisibilityOff } from "@mui/icons-material";
import {
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useBoolean, useLockFn } from "ahooks";
import { Ref, useEffect, useImperativeHandle, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { useAria2Info } from "@/hooks/aria2";

interface RpcForm {
  port: string;
  secret: string;
}

function ExternalControllerDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setFalse, setTrue }] = useBoolean();

  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const { aria2Info, patchInfo } = useAria2Info();
  const { control, handleSubmit, reset } = useForm<RpcForm>({
    defaultValues: { port: "16801", secret: "" },
  });
  const port = aria2Info?.port;
  const secret = aria2Info?.secret;
  const endpoint = aria2Info ? `http://${aria2Info.server}/jsonrpc` : "";

  useEffect(() => {
    if (open && port) {
      reset({ port: String(port), secret: secret || "" });
    }
  }, [open, port, secret, reset]);

  const onClose = () => {
    if (saving) return;
    setFalse();
    setShowSecret(false);
    reset();
  };

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: onClose,
  }));

  const onSave = useLockFn(async (form: RpcForm) => {
    setSaving(true);
    try {
      await patchInfo({ port: Number(form.port), secret: form.secret });
      Notice.success(t("setting.ExternalControllerAddressModified"), 1000);
      setFalse();
      setShowSecret(false);
    } catch (error) {
      Notice.error(
        error instanceof Error ? error.message : String(error),
        4000,
      );
    } finally {
      setSaving(false);
    }
  });

  const onCopy = useLockFn(async () => {
    try {
      await writeText(endpoint);
      Notice.success(t("setting.RpcAddressCopied"), 1000);
    } catch (error) {
      Notice.error(
        error instanceof Error ? error.message : String(error),
        4000,
      );
    }
  });

  return (
    <BaseDialog
      open={open}
      title={t("setting.ExternalController")}
      contentSx={{ width: 400, maxWidth: "100%", boxSizing: "border-box" }}
      okBtn={t("common.Save")}
      cancelBtn={t("common.Cancel")}
      onClose={onClose}
      onCancel={onClose}
      disableOk={!aria2Info}
      loading={saving}
      onOk={handleSubmit(onSave)}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          label={t("setting.RpcAddress")}
          size="small"
          value={endpoint}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={t("setting.CopyRpcAddress")}
                    onClick={onCopy}
                    disabled={!endpoint}
                    edge="end"
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Controller
          name="port"
          control={control}
          rules={{
            validate: (value) =>
              (/^\d+$/.test(value) &&
                Number(value) >= 1024 &&
                Number(value) <= 65535) ||
              t("setting.RpcPortInvalid"),
          }}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label={t("setting.RpcPort")}
              type="number"
              size="small"
              disabled={saving}
              error={!!error}
              helperText={error?.message}
              slotProps={{ htmlInput: { min: 1024, max: 65535, step: 1 } }}
            />
          )}
        />
        <Controller
          name="secret"
          control={control}
          rules={{
            validate: (value) =>
              (!/[\r\n\0]/.test(value) && value.trim() === value) ||
              t("setting.RpcSecretInvalid"),
          }}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label={t("setting.RpcSecret")}
              type={showSecret ? "text" : "password"}
              autoComplete="new-password"
              size="small"
              disabled={saving}
              error={!!error}
              helperText={error?.message || t("setting.RpcSecretHint")}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={t(
                          showSecret
                            ? "setting.HideRpcSecret"
                            : "setting.ShowRpcSecret",
                        )}
                        onClick={() => setShowSecret(!showSecret)}
                        edge="end"
                      >
                        {showSecret ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        />
        <Typography variant="body2" color="text.secondary">
          {t("setting.RpcRestartHint")}
        </Typography>
      </Stack>
    </BaseDialog>
  );
}

export default ExternalControllerDialog;
