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

// TODO: To be renovated
function PathComboBox(props: PathComboBoxProps) {
  const { setValue, openTitle, onHistory, ...innerProps } = props;
  const value = innerProps.value;

  const { t } = useTranslation();

  const pathRef = useRef("");
  const textFieldRef = useRef<HTMLInputElement>(null);

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
      setValue?.(folder);
      pathRef.current = folder;
    }
  }, [openTitle, setValue, t]);

  return (
    <TextField
      ref={textFieldRef}
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
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setValue?.(pathRef.current);
          textFieldRef.current?.blur();
        }

        if (e.key === "Escape") {
          textFieldRef.current?.blur();
        }
      }}
      {...innerProps}
      onChange={(e) => {
        pathRef.current = e.target.value;
        innerProps.onChange?.(e);
      }}
    />
  );
}

export default PathComboBox;
