import { Folder, History } from "@mui/icons-material";
import {
  IconButton,
  IconButtonProps,
  TextField,
  TextFieldProps,
} from "@mui/material";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

export type PathComboBoxProps = {
  openTitle?: string;
  value?: string;
  setValue?: (value: string) => void;
  onHistory?: IconButtonProps["onClick"];
} & TextFieldProps;

function PathComboBox(props: PathComboBoxProps) {
  const { setValue, openTitle, onHistory, ...innerProps } = props;
  const value = innerProps.value;

  const { t } = useTranslation();

  const pathRef = useRef("");

  if (value) {
    pathRef.current = value;
  }

  const onFolderPick = useCallback(async () => {
    const folder = await dialogOpen({
      directory: true,
      multiple: false,
      title: t(openTitle ?? "common.DirPick"),
    });

    if (folder) {
      pathRef.current = folder;
      setValue?.(folder);
    }
  }, [openTitle, setValue, t]);

  return (
    <TextField
      fullWidth
      label={t("common.DownloadPath")}
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          endAdornment: (
            <IconButton
              size="small"
              data-testid="open-folder-pick"
              onClick={onFolderPick}
            >
              <Folder />
            </IconButton>
          ),
          startAdornment: onHistory ? (
            <IconButton size="small" onClick={onHistory}>
              <History />
            </IconButton>
          ) : undefined,
        },
      }}
      {...innerProps}
    />
  );
}

export default PathComboBox;
