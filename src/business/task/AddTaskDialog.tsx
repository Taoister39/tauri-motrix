import { FolderOutlined } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { DialogRef } from "@/components/BaseDialog";
import { useAria2 } from "@/hooks/aria2";
import { useTaskStore } from "@/store/task";

interface IFormInput {
  link: string;
  out: string;
  split?: number;
  dir: string;
}

function AddTaskDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();

  const { addTask } = useTaskStore();

  const { aria2 } = useAria2();

  const [open, { setFalse, setTrue }] = useBoolean();

  useImperativeHandle(props.ref, () => ({
    open: setTrue,
    close: setFalse,
  }));

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IFormInput>({
    values: {
      link: "",
      split: 128,
      dir: aria2?.dir ?? "",
      out: "",
    },
  });

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    const { link, out, split, dir } = data;

    await addTask(link, {
      dir,
      split,
      out,
    });

    setFalse();
  };

  const onFolderPick = async () => {
    const folder = await dialogOpen({
      directory: true,
      multiple: false,
      title: t("task.DirPick"),
    });

    if (folder) {
      setValue("dir", folder);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={setFalse}
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleSubmit(onSubmit),
        },
      }}
    >
      <DialogTitle>{t("common.DownloadFile")}</DialogTitle>
      <DialogContent
        sx={{
          "& > *": {
            mt: 2,
          },
          "& .MuiBox-root": {
            display: "inline-flex",
            width: "100%",
            gap: 2,
          },
        }}
      >
        <Controller
          rules={{ required: true }}
          control={control}
          name="link"
          render={({ field }) => (
            <TextField
              variant="standard"
              label={t("common.DownloadLink")}
              fullWidth
              multiline
              error={!!errors.link}
              {...field}
            />
          )}
        />

        <Box>
          <Controller
            name="out"
            control={control}
            render={({ field }) => (
              <TextField
                variant="standard"
                label={t("common.Rename")}
                fullWidth
                {...field}
              />
            )}
          />
          <Controller
            name="split"
            rules={{
              min: {
                value: 1,
                message: t("task.SplitMin", { min: 1 }),
              },
              max: {
                value: 128,
                message: t("task.SplitMax", { max: 128 }),
              },
            }}
            control={control}
            render={({ field }) => (
              <TextField
                variant="standard"
                type="number"
                label={t("task.Splits")}
                error={!!errors.split}
                helperText={errors.split?.message}
                {...field}
              />
            )}
          />
        </Box>

        <Box>
          <Controller
            control={control}
            name="dir"
            render={({ field }) => (
              <TextField
                variant="standard"
                label={t("common.DownloadPath")}
                fullWidth
                disabled
                error={!!errors.dir}
                {...field}
              />
            )}
          />

          <IconButton onClick={onFolderPick} title={t("common.PickFolder")}>
            <FolderOutlined />
          </IconButton>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={setFalse}>
          {t("common.Cancel")}
        </Button>
        <Button autoFocus type="submit">
          {t("common.Submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddTaskDialog;
