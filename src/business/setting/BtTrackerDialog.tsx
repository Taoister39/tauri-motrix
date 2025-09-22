import { OpenInNew } from "@mui/icons-material";
import CheckIcon from "@mui/icons-material/Check";
import {
  Autocomplete,
  Box,
  Button,
  darken,
  FormControlLabel,
  lighten,
  styled,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useBoolean } from "ahooks";
import dayjs from "dayjs";
import {
  Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import MonacoEditor from "react-monaco-editor";

import BaseDialog, { DialogRef } from "@/components/BaseDialog";
import Tag from "@/components/Tag";
import { TRACKER_SOURCE_OPTIONS } from "@/constant/speed";
import { useAria2 } from "@/hooks/aria2";
import { useMotrix } from "@/hooks/motrix";
import { useSyncTrackerLocalStorage } from "@/hooks/useSyncTrackerLocalStorage";
import {
  convertCommaToLine,
  convertLineToComma,
  reduceTrackerString,
  syncTrackerFromSourceHelper,
} from "@/utils/tracker";

const TheQuick = styled(Box)`
  position: absolute;
  left: 14px;
  bottom: 8px;
`;

const GroupHeader = styled("div")(({ theme }) => ({
  position: "sticky",
  top: "-8px",
  padding: "4px 10px",
  color: theme.palette.primary.main,
  backgroundColor: lighten(theme.palette.primary.light, 0.85),
  ...theme.applyStyles("dark", {
    backgroundColor: darken(theme.palette.primary.main, 0.8),
  }),
  display: "flex",
  alignItems: "center",
  gap: 4,
}));

const GroupItems = styled("ul")({
  padding: 0,
});

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
  const {
    isAutoSyncTracker,
    lastSyncTrackerTime,
    setIsAutoSyncTracker,
    setLastSyncTrackerTime,
  } = useSyncTrackerLocalStorage();
  const [tracker, setTracker] = useState("");

  const { aria2, patchAria2 } = useAria2();
  const { motrix, patchMotrix } = useMotrix();

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

  const groupUrlMap = useMemo(
    () =>
      TRACKER_SOURCE_OPTIONS.reduce(
        (previousValue, currentValue) => {
          previousValue[currentValue.label] = currentValue.url;
          return previousValue;
        },
        {} as Record<string, string>,
      ),
    [],
  );

  useEffect(() => {
    const btTracker = aria2?.["bt-tracker"];
    if (btTracker) {
      setTracker(convertCommaToLine(btTracker));
    }
  }, [aria2]);

  useEffect(() => {
    const trackerSource = motrix?.tracker_source;

    if (trackerSource) {
      const options = trackerOptions.filter((x) =>
        trackerSource.includes(x.url),
      );
      setSyncRemotes(options);
    }
  }, [motrix?.tracker_source, trackerOptions]);

  const syncTrackerFromSource = useCallback(async () => {
    const line = await syncTrackerFromSourceHelper(
      syncRemotes.map((x) => x.url),
    );
    setTracker(line);
  }, [syncRemotes]);

  const handleOk = useCallback(async () => {
    const btTracker = reduceTrackerString(convertLineToComma(tracker));

    await patchAria2({ "bt-tracker": btTracker });
    await patchMotrix({
      tracker_source: syncRemotes.map((x) => x.url),
    });

    setLastSyncTrackerTime(Date.now());

    setFalse();
  }, [
    patchAria2,
    patchMotrix,
    setFalse,
    setLastSyncTrackerTime,
    syncRemotes,
    tracker,
  ]);

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
      onOk={handleOk}
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
          renderGroup={(params) => (
            <li key={params.key}>
              <GroupHeader>
                {params.group}
                <OpenInNew
                  fontSize="small"
                  style={{ cursor: "pointer" }}
                  onClick={() => openUrl(groupUrlMap[params.group])}
                />
              </GroupHeader>
              <GroupItems>{params.children}</GroupItems>
            </li>
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
          onChange={(_, value) => {
            setSyncRemotes(value);
          }}
          value={syncRemotes}
        />
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            void syncTrackerFromSource();
          }}
        >
          {t("common.Sync")}
        </Button>
      </Box>
      <MonacoEditor
        language="txt"
        theme={themeMode === "light" ? "vs" : "vs-dark"}
        value={tracker}
        onChange={setTracker}
      />
      <TheQuick>
        <FormControlLabel
          control={
            <Switch
              checked={isAutoSyncTracker}
              onChange={(_, checked) => {
                setIsAutoSyncTracker(checked);
              }}
            />
          }
          label={
            <Box>
              <Typography variant="body1" fontSize={14}>
                {t("setting.AutoSyncTracker")}
              </Typography>
              <Typography variant="body2" color="textSecondary" fontSize={12}>
                {t("common.LastSyncTime", {
                  time: lastSyncTrackerTime
                    ? dayjs(lastSyncTrackerTime).format("YYYY-MM-DD HH:mm:ss")
                    : "-",
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
