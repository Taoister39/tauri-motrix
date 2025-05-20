import {
  Box,
  List,
  ListItem,
  listItemClasses,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useBoolean, useLockFn } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { SPEED_UNITS, SpeedUnit } from "@/constant/speed";
import { useAria2 } from "@/hooks/aria2";
import { parseByte, toByte } from "@/utils/download";

interface IFormInput {
  uploadSpeed: number;
  uploadUnit: SpeedUnit;
  downloadSpeed: number;
  downloadUnit: SpeedUnit;
}

function SpeedLimitDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setFalse, setTrue }] = useBoolean();
  const { aria2, patchAria2 } = useAria2();

  const downloadSpeed = parseByte(aria2?.["max-download-limit"] || 0, "KB");
  const uploadSpeed = parseByte(aria2?.["max-upload-limit"] || 0, "KB");

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IFormInput>({
    values: {
      uploadSpeed,
      uploadUnit: "KB",
      downloadSpeed,
      downloadUnit: "KB",
    },
  });

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: onClose,
  }));

  const onClose = () => {
    setFalse();
    reset();
  };

  const onSave: SubmitHandler<IFormInput> = useLockFn(
    async ({ downloadSpeed, uploadSpeed, uploadUnit, downloadUnit }) => {
      const upload = toByte(uploadSpeed, uploadUnit) + "";
      const download = toByte(downloadSpeed, downloadUnit) + "";

      await patchAria2({
        "max-upload-limit": upload,
        "max-download-limit": download,
      });
      Notice.success(t("common.SaveSuccess"));
      onClose();
    },
  );

  return (
    <BaseDialog
      open={open}
      onCancel={onClose}
      onClose={onClose}
      title={t("setting.SpeedLimit")}
      okBtn={t("common.Save")}
      cancelBtn={t("common.Cancel")}
      onOk={handleSubmit(onSave)}
    >
      <List
        sx={{
          [`.${listItemClasses.root}`]: {
            padding: "5px 2px",
          },
        }}
      >
        <ListItem>
          <ListItemText primary={t("setting.UploadSpeedLimit")} />

          <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
            <Controller
              control={control}
              rules={{
                min: 0,
              }}
              name="uploadSpeed"
              render={({ field }) => (
                <TextField
                  type="number"
                  size="small"
                  error={!!errors.uploadSpeed}
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name="uploadUnit"
              render={({ field }) => (
                <Select size="small" sx={{ width: 100 }} {...field}>
                  {SPEED_UNITS.map(({ label, value }) => (
                    <MenuItem value={value}>{label}</MenuItem>
                  ))}
                </Select>
              )}
            />
          </Box>
        </ListItem>

        <ListItem>
          <ListItemText primary={t("setting.DownloadSpeedLimit")} />

          <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
            <Controller
              control={control}
              rules={{
                min: 0,
              }}
              name="downloadSpeed"
              render={({ field }) => (
                <TextField
                  type="number"
                  size="small"
                  error={!!errors.downloadSpeed}
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name="downloadUnit"
              render={({ field }) => (
                <Select size="small" sx={{ width: 100 }} {...field}>
                  {SPEED_UNITS.map(({ label, value }) => (
                    <MenuItem value={value}>{label}</MenuItem>
                  ))}
                </Select>
              )}
            />
          </Box>
        </ListItem>
      </List>
    </BaseDialog>
  );
}

export default SpeedLimitDialog;
