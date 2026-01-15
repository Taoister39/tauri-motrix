import {
  Box,
  Button,
  FormControlLabel,
  formControlLabelClasses,
  Switch,
  TextField,
  textFieldClasses,
} from "@mui/material";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { useAria2 } from "@/hooks/aria2";

interface IForm {
  maxConcurrentDownloads: number;
  maxConnectionPerServer: number;
  seedRatio: number;
  seedTime: number;
  keepSeeding: boolean;
  btListenPort: number;
  dhtListenPort: number;
}

// TODO: ui upgrade
function TaskManagementDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setTrue, setFalse }] = useBoolean();

  const { aria2, patchAria2 } = useAria2();

  useImperativeHandle(props.ref, () => ({
    close: setFalse,
    open: setTrue,
  }));

  const maxConcurrentDownloads =
    Number(aria2?.["max-concurrent-downloads"]) || 0;
  const maxConnectionPerServer =
    Number(aria2?.["max-connection-per-server"]) || 0;
  const seedRatio = Number(aria2?.["seed-ratio"]) || 0;
  const seedTime = Number(aria2?.["seed-time"]) || 0;
  const btListenPort = Number(aria2?.["bt-listen-port"]) || 6881;
  const dhtListenPort = Number(aria2?.["dht-listen-port"]) || 6881;

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<IForm>({
    values: {
      maxConcurrentDownloads,
      maxConnectionPerServer,
      seedRatio,
      seedTime,
      keepSeeding: seedRatio === 0,
      btListenPort,
      dhtListenPort,
    },
  });

  const onClose = () => {
    setFalse();
    reset();
  };

  const updateConfig: SubmitHandler<IForm> = async (form) => {
    const {
      maxConcurrentDownloads,
      maxConnectionPerServer,
      seedRatio,
      seedTime,
      keepSeeding,
      btListenPort,
      dhtListenPort,
    } = form;

    const seedRatioDto = keepSeeding ? "0" : seedRatio.toString();
    const seedTimeDto = keepSeeding ? "0" : seedTime.toString();

    await patchAria2({
      "max-concurrent-downloads": maxConcurrentDownloads.toString(),
      "max-connection-per-server": maxConnectionPerServer.toString(),
      "seed-ratio": seedRatioDto,
      "seed-time": seedTimeDto,
      "bt-listen-port": btListenPort.toString(),
      "dht-listen-port": dhtListenPort.toString(),
    });

    Notice.success(t("common.SaveSuccess"));
    onClose();
  };

  return (
    <BaseDialog
      title={t("setting.TaskManagement")}
      open={open}
      onClose={setFalse}
      onCancel={setFalse}
      okBtn={t("common.Save")}
      cancelBtn={t("common.Cancel")}
      enableForm
      onSubmit={handleSubmit(updateConfig)}
    >
      <Box
        sx={{
          [`.${textFieldClasses.root}`]: {
            mt: 2,
          },
          [`.${formControlLabelClasses.root}`]: {
            width: "100%",
          },
        }}
      >
        <Controller
          control={control}
          name="maxConcurrentDownloads"
          rules={{
            min: 1,
            max: 10,
          }}
          render={({ field }) => (
            <TextField
              type="number"
              fullWidth
              label={t("setting.MaxConcurrentTasks")}
              size="small"
              error={!!errors.maxConcurrentDownloads}
              {...field}
            />
          )}
        />

        <Controller
          control={control}
          name="maxConnectionPerServer"
          rules={{
            min: 1,
            max: 128,
          }}
          render={({ field }) => (
            <TextField
              type="number"
              fullWidth
              label={t("setting.MaxConnectionPerServer")}
              size="small"
              error={!!errors.maxConnectionPerServer}
              {...field}
            />
          )}
        />

        <Controller
          control={control}
          name="keepSeeding"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} />}
              label={t("setting.KeepSeeding")}
            />
          )}
        />

        {!watch("keepSeeding") && (
          <>
            <Controller
              control={control}
              name="seedRatio"
              rules={{
                min: 1,
                max: 100,
              }}
              render={({ field }) => (
                <TextField
                  type="number"
                  fullWidth
                  label={t("setting.SeedRatio")}
                  size="small"
                  error={!!errors.seedRatio}
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name="seedTime"
              rules={{
                min: 1,
                max: 525600,
              }}
              render={({ field }) => (
                <TextField
                  type="number"
                  fullWidth
                  label={t("setting.SeedTime")}
                  size="small"
                  error={!!errors.seedTime}
                  {...field}
                />
              )}
            />
          </>
        )}

        <Controller
          control={control}
          name="btListenPort"
          rules={{
            min: 1024,
            max: 65535,
          }}
          render={({ field }) => (
            <TextField
              type="number"
              fullWidth
              label={t("setting.BtListenPort")}
              size="small"
              error={!!errors.btListenPort}
              helperText={t("setting.BtListenPortHelper")}
              {...field}
            />
          )}
        />

        <Controller
          control={control}
          name="dhtListenPort"
          rules={{
            min: 1024,
            max: 65535,
          }}
          render={({ field }) => (
            <TextField
              type="number"
              fullWidth
              label={t("setting.DhtListenPort")}
              size="small"
              error={!!errors.dhtListenPort}
              helperText={t("setting.DhtListenPortHelper")}
              {...field}
            />
          )}
        />
      </Box>
    </BaseDialog>
  );
}

export default TaskManagementDialog;
