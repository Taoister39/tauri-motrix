import CheckIcon from "@mui/icons-material/Check";
import {
  Autocomplete,
  Box,
  FormControlLabel,
  styled,
  Switch,
  TextField,
  useTheme,
} from "@mui/material";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle, useMemo } from "react";
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

function BtTrackerDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const {
    palette: { mode: themeMode },
  } = useTheme();

  const [open, { setFalse, setTrue }] = useBoolean();

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: setFalse,
  }));

  const trackerOptions = useMemo(() => {
    return TRACKER_SOURCE_OPTIONS.flatMap((x) => {
      const group = x.label;

      return x.options.map((y) => {
        const title = y.label;
        const url = y.value;
        const cdn = y.cdn;
        return { group, title, url, cdn };
      });
    });
  }, []);

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
          const { key, ...optionProps } = props;
          return (
            <li key={key} {...optionProps}>
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
      />
      <MonacoEditor
        language="txt"
        theme={themeMode === "light" ? "vs" : "vs-dark"}
      />
      <TheQuick>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label={"Update tracker list every day automatically"}
        />
      </TheQuick>
    </BaseDialog>
  );
}

export default BtTrackerDialog;
