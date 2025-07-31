import { FormControlLabel, TextField } from "@mui/material";
import { useBoolean } from "ahooks";
import { Ref, useCallback, useImperativeHandle } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Android12Switch } from "@/client/styled_compose";
import BaseDialog, { DialogRef } from "@/components/BaseDialog";
import { useMotrix } from "@/hooks/motrix";

interface IFormInput {
  enableUpnp: boolean;
  listenPort: number;
  dhtListenPort: number;
}

function ListenPortsViewer(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setTrue, setFalse }] = useBoolean();

  const { motrix, patchMotrix } = useMotrix();

  const { control, handleSubmit, reset } = useForm<IFormInput>({
    values: {
      enableUpnp: !!motrix?.enable_upnp,
      listenPort: motrix?.bt_listen_port || 21301,
      dhtListenPort: motrix?.dht_listen_port || 26701,
    },
  });

  useImperativeHandle(props.ref, () => ({ close: setFalse, open: setTrue }));

  const updatePort = useCallback(
    async (form: IFormInput) => {
      await patchMotrix({
        enable_upnp: form.enableUpnp,
        bt_listen_port: Number(form.listenPort),
        dht_listen_port: Number(form.dhtListenPort),
      });
      setFalse();
      reset();
    },
    [patchMotrix, reset, setFalse],
  );

  return (
    <BaseDialog
      open={open}
      onClose={setFalse}
      onCancel={setFalse}
      title="Listen Ports"
      enableForm
      contentSx={{
        "& > *:not(:last-child)": {
          marginBottom: 2,
        },
      }}
      onSubmit={handleSubmit(updatePort)}
    >
      <Controller
        control={control}
        name="enableUpnp"
        render={({ field }) => (
          <FormControlLabel
            control={<Android12Switch {...field} checked={field.value} />}
            label="UPnP"
          />
        )}
      />
      <Controller
        control={control}
        name="listenPort"
        rules={{
          required: true,
          min: 1024,
          max: 65535,
        }}
        render={({ field, fieldState: { error } }) => (
          <TextField
            type="number"
            fullWidth
            size="small"
            label={t("setting.BtPort")}
            error={!!error}
            {...field}
          />
        )}
      />
      <Controller
        control={control}
        name="dhtListenPort"
        rules={{
          required: true,
          min: 1024,
          max: 65535,
        }}
        render={({ field, fieldState: { error } }) => (
          <TextField
            type="number"
            fullWidth
            size="small"
            label={t("setting.DhtPort")}
            error={!!error}
            {...field}
          />
        )}
      />
    </BaseDialog>
  );
}

export default ListenPortsViewer;
