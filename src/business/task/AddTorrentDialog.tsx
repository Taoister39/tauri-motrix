import { Grid, TextField } from "@mui/material";
import { useBoolean } from "ahooks";
import { remote } from "parse-torrent";
import { Ref, useCallback, useImperativeHandle, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import HistoryPathInput from "@/business/history/HistoryPathInput";
import TaskFiles, { TaskFile } from "@/business/task/TaskFiles";
import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import InputFileUpload from "@/components/InputFileUpload";
import { DOWNLOAD_ENGINE } from "@/constant/task";
import { useAria2 } from "@/hooks/aria2";
import { addTorrentApi } from "@/services/aria2c_api";
import { addOneDir, findOneDirByPath } from "@/services/save_to_history";
import { useTaskStore } from "@/store/task";
import { compactUndefined } from "@/utils/compact_undefined";
import { getAsBase64, listTorrentFiles } from "@/utils/file";

interface IFormInput {
  out: string;
  split?: number;
  dir: string;
  selectFiles: string[];
}

function AddTorrentDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setFalse, setTrue }] = useBoolean();

  const [torrentFiles, setTorrentFiles] = useState<TaskFile[]>([]);
  const [fileList, setFileList] = useState<File[]>([]);

  const fetchTasks = useTaskStore((state) => state.fetchTasks);

  const { aria2 } = useAria2();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IFormInput>({
    values: {
      split: 128,
      dir: aria2?.dir ?? "",
      out: "",
      selectFiles: [],
    },
  });

  useImperativeHandle(props.ref, () => ({ close: setFalse, open: setTrue }));

  const setDirValue = useCallback(
    (value: string) => setValue("dir", value),
    [setValue],
  );

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    const { out, split, dir, selectFiles } = data;

    const torrent = await getAsBase64(fileList[0]);

    await addTorrentApi(
      torrent,
      compactUndefined({
        "select-file": selectFiles.join(","),
        out,
        split,
        dir,
      }),
    );
    await fetchTasks();

    const dirRecord = await findOneDirByPath(dir);

    if (!dirRecord && dir) {
      await addOneDir({
        dir,
        engine: DOWNLOAD_ENGINE.Aria2,
      });
      mutate("getSaveToHistory");
    }

    setFalse();
  };

  return (
    <BaseDialog
      open={open}
      title={t("common.DownloadFile")}
      okBtn={t("common.Submit")}
      cancelBtn={t("common.Cancel")}
      onCancel={setFalse}
      onClose={setFalse}
      disableOk={!torrentFiles?.length}
      onSubmit={handleSubmit(onSubmit)}
      enableForm
    >
      <InputFileUpload
        accept=".torrent"
        fileList={fileList}
        onChange={(files) => {
          setFileList(files);
          if (!files.length) {
            setTorrentFiles([]);
            return;
          }
          const file = files[0];

          remote(file, (err, parsedTorrent) => {
            if (err) {
              throw err;
            }
            setTorrentFiles(listTorrentFiles(parsedTorrent?.files) ?? []);
          });
        }}
      />
      {!!torrentFiles?.length && (
        <>
          <Controller
            name="selectFiles"
            control={control}
            rules={{
              required: t("task.SelectFilesError"),
            }}
            render={({ field }) => (
              <TaskFiles
                files={torrentFiles}
                rowKey="idx"
                selectedRowKeys={field.value}
                onSelectionChange={field.onChange}
                error={!!errors.selectFiles}
                helperText={errors.selectFiles?.message}
                height={200}
              />
            )}
          />

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <Controller
                name="out"
                control={control}
                render={({ field }) => (
                  <TextField
                    label={t("common.Rename")}
                    fullWidth
                    placeholder={t("common.Optional")}
                    size="small"
                    error={!!errors.out}
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
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
                    fullWidth
                    placeholder={t("common.Optional")}
                    size="small"
                    type="number"
                    label={t("task.Splits")}
                    error={!!errors.split}
                    helperText={errors.split?.message}
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="dir"
                control={control}
                render={({ field }) => (
                  <HistoryPathInput
                    setValue={setDirValue}
                    error={!!errors.dir}
                    openTitle="task.DirPick"
                    placeholder={t("common.Optional")}
                    {...field}
                  />
                )}
              />
            </Grid>
          </Grid>
        </>
      )}
    </BaseDialog>
  );
}

export default AddTorrentDialog;
