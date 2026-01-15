import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  formControlLabelClasses,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  textFieldClasses,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useBoolean, useLockFn } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { useAria2 } from "@/hooks/aria2";
import type { Aria2Config } from "@/services/type";

const HTTP_UA_PRESETS: Record<string, string> = {
  default: "",
  chrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  firefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  safari_ios:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
};

const BT_UA_PRESETS: Record<
  string,
  { userAgent: string; peerIdPrefix: string }
> = {
  default: { userAgent: "", peerIdPrefix: "" },
  qbittorrent: {
    userAgent: "qBittorrent/5.0.3",
    peerIdPrefix: "-qB5030-",
  },
  utorrent: {
    userAgent: "uTorrent/3600(45800)",
    peerIdPrefix: "-UT3600-",
  },
  transmission: {
    userAgent: "Transmission/4.0.6",
    peerIdPrefix: "-TR4060-",
  },
  deluge: {
    userAgent: "Deluge/2.1.1",
    peerIdPrefix: "-DE21F-",
  },
  aria2: {
    userAgent: "aria2/1.37.0",
    peerIdPrefix: "-aria2-",
  },
};

interface IFormInput {
  httpUaPreset: string;
  httpUserAgent: string;
  btUaPreset: string;
  btUserAgent: string;
  peerIdPrefix: string;
  enableProxy: boolean;
  proxyServer: string;
  proxyBypass: Array<{
    value: string;
  }>;
}

function UserAgentDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setFalse, setTrue }] = useBoolean();
  const { aria2, patchAria2 } = useAria2();

  const currentUserAgent = aria2?.["user-agent"] || "";
  const currentBtUserAgent = aria2?.["bt-user-agent"] || "";
  const currentPeerIdPrefix = aria2?.["peer-id-prefix"] || "";
  const allProxy = aria2?.["all-proxy"] ?? "";
  const noProxy = aria2?.["no-proxy"] ?? "";
  const proxyBypass = noProxy
    ? noProxy.split(",").map((value) => ({ value }))
    : [{ value: "" }];

  let currentHttpUaPreset = "default";
  for (const [key, value] of Object.entries(HTTP_UA_PRESETS)) {
    if (value === currentUserAgent) {
      currentHttpUaPreset = key;
      break;
    }
  }

  let currentBtUaPreset = "default";
  for (const [key, value] of Object.entries(BT_UA_PRESETS)) {
    if (
      value.userAgent === currentBtUserAgent &&
      value.peerIdPrefix === currentPeerIdPrefix
    ) {
      currentBtUaPreset = key;
      break;
    }
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<IFormInput>({
    values: {
      httpUaPreset: currentHttpUaPreset,
      httpUserAgent: currentUserAgent,
      btUaPreset: currentBtUaPreset,
      btUserAgent: currentBtUserAgent,
      peerIdPrefix: currentPeerIdPrefix,
      enableProxy: !!allProxy,
      proxyServer: allProxy,
      proxyBypass,
    },
  });

  const {
    fields: proxyBypassFields,
    append: appendProxyBypass,
    remove: removeProxyBypass,
  } = useFieldArray({
    control,
    name: "proxyBypass",
  });

  const httpUaPreset = watch("httpUaPreset");
  const btUaPreset = watch("btUaPreset");
  const hasProxy = !!watch("enableProxy");

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: onClose,
  }));

  const onClose = () => {
    setFalse();
    reset();
  };

  const onSave: SubmitHandler<IFormInput> = useLockFn(
    async ({
      httpUserAgent,
      btUserAgent,
      peerIdPrefix,
      enableProxy,
      proxyServer,
      proxyBypass,
    }) => {
      const patchData: Partial<Aria2Config> = {};

      if (httpUserAgent) {
        patchData["user-agent"] = httpUserAgent;
      } else {
        patchData["user-agent"] = "";
      }

      if (btUserAgent) {
        patchData["bt-user-agent"] = btUserAgent;
      } else {
        patchData["bt-user-agent"] = "";
      }

      if (peerIdPrefix) {
        patchData["peer-id-prefix"] = peerIdPrefix;
      } else {
        patchData["peer-id-prefix"] = "";
      }

      const proxyBypassDto = proxyBypass
        .map(({ value }) => value)
        .filter(Boolean)
        .join(",");

      if (enableProxy) {
        patchData["all-proxy"] = proxyServer;
        patchData["no-proxy"] = proxyBypassDto;
      } else {
        patchData["all-proxy"] = "";
        patchData["no-proxy"] = "";
      }

      await patchAria2(patchData);
      Notice.success(t("common.SaveSuccess"));
      onClose();
    },
  );

  return (
    <BaseDialog
      open={open}
      onCancel={onClose}
      onClose={onClose}
      title={t("setting.UserAgentSettings")}
      okBtn={t("common.Save")}
      cancelBtn={t("common.Cancel")}
      enableForm
      onSubmit={handleSubmit(onSave)}
      maxWidth="lg"
      fullWidth
      contentSx={{ minWidth: 0 }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minWidth: 0,
          [`.${textFieldClasses.root}`]: {
            mt: 2,
            minWidth: 0,
          },
          [`.${formControlLabelClasses.root}`]: {
            width: "100%",
          },
        }}
      >
        <Typography sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
          {t("setting.TrafficProxy")}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
          {t("setting.TraffiProxyDescription")}
        </Typography>

        <Controller
          control={control}
          name="proxyServer"
          render={({ field }) => (
            <TextField
              label={t("setting.ProxyServer")}
              fullWidth
              size="small"
              error={!!errors.proxyServer}
              placeholder="[http://][USER:PASSWORD@]HOST[:PORT]"
              {...field}
            />
          )}
        />

        {proxyBypassFields.map((item, index) => (
          <Controller
            key={item.id}
            control={control}
            name={`proxyBypass.${index}.value`}
            rules={{
              validate: (value) =>
                !value.includes(",") ||
                t(
                  "setting.ValueCannotContainCommas",
                  "Value cannot contain commas",
                ),
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                placeholder={t("setting.ProxyBypassPlaceholder")}
                fullWidth
                size="small"
                label={t("setting.ProxyBypass", { index: index + 1 })}
                error={!!error}
                helperText={error?.message}
                slotProps={{
                  input: {
                    endAdornment:
                      proxyBypassFields.length > 1 ? (
                        <IconButton
                          size="small"
                          onClick={() => removeProxyBypass(index)}
                        >
                          <Remove />
                        </IconButton>
                      ) : null,
                  },
                }}
              />
            )}
          />
        ))}
        <Button
          startIcon={<Add />}
          onClick={() => appendProxyBypass({ value: "" })}
          sx={{ mt: 1 }}
        >
          {t("common.add", "Add")}
        </Button>

        <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
          {t("setting.HttpUserAgent")}
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>{t("setting.PresetUa")}</InputLabel>
          <Controller
            control={control}
            name="httpUaPreset"
            render={({ field }) => (
              <Select
                {...field}
                label={t("setting.PresetUa")}
                onChange={(e) => {
                  field.onChange(e);
                  const preset = HTTP_UA_PRESETS[e.target.value];
                  if (preset) {
                    setValue("httpUserAgent", preset);
                  } else {
                    setValue("httpUserAgent", "");
                  }
                }}
              >
                {Object.entries(HTTP_UA_PRESETS).map(([key, _]) => (
                  <MenuItem key={key} value={key}>
                    {t(`setting.HttpUaPresets.${key}`)}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <Controller
          control={control}
          name="httpUserAgent"
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={2}
              label={t("setting.CustomHttpUserAgent")}
              placeholder={t("setting.CustomHttpUserAgentPlaceholder")}
              error={!!errors.httpUserAgent}
              helperText={errors.httpUserAgent?.message}
              size="small"
              sx={{ minWidth: 0 }}
            />
          )}
        />

        <Typography sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
          {t("setting.BtUserAgent")}
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>{t("setting.PresetUa")}</InputLabel>
          <Controller
            control={control}
            name="btUaPreset"
            render={({ field }) => (
              <Select
                {...field}
                label={t("setting.PresetUa")}
                onChange={(e) => {
                  field.onChange(e);
                  const preset = BT_UA_PRESETS[e.target.value];
                  if (preset) {
                    setValue("btUserAgent", preset.userAgent);
                    setValue("peerIdPrefix", preset.peerIdPrefix);
                  } else {
                    setValue("btUserAgent", "");
                    setValue("peerIdPrefix", "");
                  }
                }}
              >
                {Object.entries(BT_UA_PRESETS).map(([key, _]) => (
                  <MenuItem key={key} value={key}>
                    {t(`setting.BtUaPresets.${key}`)}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <Controller
          control={control}
          name="btUserAgent"
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={2}
              label={t("setting.CustomBtUserAgent")}
              placeholder={t("setting.CustomBtUserAgentPlaceholder")}
              error={!!errors.btUserAgent}
              helperText={errors.btUserAgent?.message}
              size="small"
              sx={{ minWidth: 0 }}
            />
          )}
        />

        <Controller
          control={control}
          name="peerIdPrefix"
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label={t("setting.PeerIdPrefix")}
              placeholder={t("setting.PeerIdPrefixPlaceholder")}
              error={!!errors.peerIdPrefix}
              helperText={errors.peerIdPrefix?.message}
              size="small"
            />
          )}
        />
      </Box>
    </BaseDialog>
  );
}

export default UserAgentDialog;
