import CheckIcon from "@mui/icons-material/Check";
import {
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  styled,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { useBoolean, useLocalStorageState } from "ahooks";
import dayjs from "dayjs";
import { Ref, useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import MonacoEditor from "react-monaco-editor";

import BaseDialog, { DialogRef } from "@/components/BaseDialog";
import Tag from "@/components/Tag";
import { TRACKER_SOURCE_OPTIONS } from "@/constant/speed";

const TheQuick = styled(Box)`
  position: absolute;
  left: 14px;
  bottom: 8px;
`;

interface TrackerOption {
  group: string;
  title: string;
  url: string;
  cdn: boolean;
}

function BtTrackerDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const {
    palette: { mode: themeMode },
  } = useTheme();

  const [open, { setFalse, setTrue }] = useBoolean();
  const [syncRemotes, setSyncRemotes] = useState<TrackerOption[]>([]);
  const [lastSyncTrackerTime] = useLocalStorageState("last-sync-tracker-time", {
    defaultValue: Date.now(),
  });

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: setFalse,
  }));

  const trackerOptions = useMemo(
    () =>
      TRACKER_SOURCE_OPTIONS.flatMap((x) => {
        const group = x.label;

        return x.options.map((y) => {
          const title = y.label;
          const url = y.value;
          const cdn = y.cdn;
          return { group, title, url, cdn };
        });
      }),
    [],
  );

  const syncTrackerFromSource = () => {
    const now = Date.now();
    const promises = syncRemotes.map(({ url }) => {
      return fetch(`${url}?t=${now}`).then((res) => res.text());
    });
    Promise.all(promises);
  };

  return (
    <BaseDialog
      open={open}
      title={t("setting.BtTracker")}
      onCancel={setFalse}
      onClose={setFalse}
      fullWidth
      maxWidth="xl"
      contentSx={() => ({
        width: "auto",
        height: "calc(100vh - 185px)",
        overflow: "hidden",
        display: "flex",
        gap: "16px",
        flexDirection: "column",
        pt: "6px !important",
      })}
    >
      <Box sx={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <Autocomplete
          multiple
          size="small"
          options={trackerOptions}
          groupBy={(option) => option.group}
          getOptionLabel={(option) => option.title}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tracker Servers Autocomplete"
              variant="standard"
            />
          )}
          renderOption={(props, option, { selected }) => {
            return (
              <li {...props} key={option.url}>
                <span style={{ flexGrow: 1 }}>{option.title}</span>
                {option.cdn && (
                  <Tag type="success" style={{ marginRight: 24 }}>
                    CDN
                  </Tag>
                )}
                <CheckIcon
                  fontSize="small"
                  style={{ visibility: selected ? "visible" : "hidden" }}
                />
              </li>
            );
          }}
          disableCloseOnSelect
          onChange={(_, value) => setSyncRemotes(value)}
          value={syncRemotes}
        />
        <Button
          size="small"
          variant="contained"
          onClick={syncTrackerFromSource}
        >
          Sync
        </Button>
      </Box>
      <MonacoEditor
        language="txt"
        theme={themeMode === "light" ? "vs" : "vs-dark"}
      />
      <TheQuick>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label={
            <Box>
              <Typography variant="body1" fontSize={14}>
                {t("setting.AutoSyncTracker")}
              </Typography>
              <Typography variant="body2" color="textSecondary" fontSize={12}>
                {t("common.LastSyncTime", {
                  time: dayjs(lastSyncTrackerTime).format(
                    "YYYY-MM-DD HH:mm:ss",
                  ),
                })}
              </Typography>
            </Box>
          }
        />
      </TheQuick>
    </BaseDialog>
  );
}

export default BtTrackerDialog;
