import { Alert, Box, Grid, Tab, Tabs, TextField } from "@mui/material";
import { useBoolean } from "ahooks";
import { remote } from "parse-torrent";
import { FormEvent, Ref, useImperativeHandle, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { mutate } from "swr";

import HistoryPathInput from "@/business/history/HistoryPathInput";
import TaskFiles, { TaskFile } from "@/business/task/TaskFiles";
import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import InputFileUpload from "@/components/InputFileUpload";
import { Notice } from "@/components/Notice";
import { DOWNLOAD_ENGINE } from "@/constant/task";
import { useAria2 } from "@/hooks/aria2";
import { useMotrix } from "@/hooks/motrix";
import { addTaskApi, addTorrentApi } from "@/services/download";
import { addOneDir, findOneDirByPath } from "@/services/save_to_history";
import { useTaskStore } from "@/store/task";
import { getAsBase64, listTorrentFiles } from "@/utils/file";
import {
  buildDownloadOptions,
  TaskForm,
  TaskSource,
  usesVortex,
} from "@/utils/task_options";

export interface AddTaskDialogRef extends DialogRef {
  open: (source?: TaskSource) => void;
}

function AddTaskDialog(props: { ref: Ref<AddTaskDialogRef> }) {
  const { t } = useTranslation();
  const { motrix } = useMotrix();
  const { aria2 } = useAria2();
  const navigate = useNavigate();
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const [open, { setFalse, setTrue }] = useBoolean();
  const [source, setSource] = useState<TaskSource>("url");
  const [fileList, setFileList] = useState<File[]>([]);
  const [torrentFiles, setTorrentFiles] = useState<TaskFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(false);
  const parseVersion = useRef(0);
  const submitPending = useRef(false);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    shouldUnregister: true,
    defaultValues: {
      link: "",
      split: 128,
      dir: "",
      out: "",
      userAgent: "",
      selectFiles: [],
    },
  });

  const clearTorrent = () => {
    parseVersion.current++;
    setFileList([]);
    setTorrentFiles([]);
    setValue("selectFiles", []);
    setParsing(false);
    setParseError(false);
  };
  const onClose = () => {
    if (submitPending.current) return;
    clearTorrent();
    setFalse();
  };
  useImperativeHandle(props.ref, () => ({
    open: (initialSource = "url") => {
      if (submitPending.current) return;
      clearTorrent();
      reset({
        link: "",
        split: 128,
        dir: aria2?.dir ?? "",
        out: "",
        userAgent: "",
        selectFiles: [],
      });
      setSource(initialSource);
      setTrue();
    },
    close: onClose,
  }));

  const useVortex = usesVortex(
    source,
    watch("link") ?? "",
    motrix?.http_engine,
  );
  const onFilesChange = (files: File[]) => {
    clearTorrent();
    clearErrors("selectFiles");
    setFileList(files);
    if (!files.length) return;
    const version = parseVersion.current;
    setParsing(true);
    remote(files[0], (error, torrent) => {
      if (parseVersion.current !== version) return;
      setParsing(false);
      const parsedFiles = listTorrentFiles(torrent?.files) ?? [];
      if (error || !parsedFiles.length) {
        setParseError(true);
        return;
      }
      setTorrentFiles(parsedFiles);
      setValue(
        "selectFiles",
        parsedFiles.map((file) => file.idx),
      );
    });
  };

  const onSubmit = async (form: TaskForm) => {
    if (source === "torrent" && (parsing || !torrentFiles.length)) return;
    try {
      const options = buildDownloadOptions(form, source, motrix?.http_engine);
      if (source === "torrent") {
        await addTorrentApi(await getAsBase64(fileList[0]), options);
      } else {
        await addTaskApi(form.link.trim(), options);
      }
      clearTorrent();
      setFalse();
      if (motrix?.new_task_show_downloading) navigate("/task-start");
      await fetchTasks();
      if (form.dir && !(await findOneDirByPath(form.dir))) {
        await addOneDir({
          dir: form.dir,
          engine: useVortex ? DOWNLOAD_ENGINE.Vortex : DOWNLOAD_ENGINE.Aria2,
        });
        await mutate("getSaveToHistory");
      }
    } catch (error) {
      Notice.error(error instanceof Error ? error.message : String(error));
    }
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (submitPending.current) return;
    submitPending.current = true;
    try {
      await handleSubmit(onSubmit)(event);
    } finally {
      submitPending.current = false;
    }
  };

  return (
    <BaseDialog
      open={open}
      title={t("common.DownloadFile")}
      okBtn={t("common.Submit")}
      onCancel={onClose}
      onClose={onClose}
      onSubmit={submitForm}
      enableForm
      fullWidth
      maxWidth="sm"
      loading={isSubmitting}
      disableOk={source === "torrent" && (parsing || !torrentFiles.length)}
    >
      <Box
        component="fieldset"
        disabled={isSubmitting}
        sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
      >
        <Tabs
          value={source}
          aria-label={t("common.DownloadFile")}
          onChange={(_, value: TaskSource) => {
            clearTorrent();
            clearErrors();
            setSource(value);
          }}
          sx={{ mb: 2 }}
        >
          <Tab
            value="url"
            label={t("common.FromUrl")}
            disabled={isSubmitting}
          />
          <Tab
            value="torrent"
            label={t("common.FromTorrentFile")}
            disabled={isSubmitting}
          />
        </Tabs>
        {source === "url" ? (
          <Controller
            name="link"
            control={control}
            rules={{ validate: (value) => !!value.trim() }}
            render={({ field }) => (
              <TextField
                label={t("common.DownloadLink")}
                fullWidth
                multiline
                minRows={2}
                size="small"
                error={!!errors.link}
                {...field}
              />
            )}
          />
        ) : (
          <>
            <InputFileUpload
              accept=".torrent"
              fileList={fileList}
              onChange={onFilesChange}
            />
            {parseError && (
              <Alert severity="error">{t("task.InvalidTorrent")}</Alert>
            )}
            {!!torrentFiles.length && (
              <Controller
                name="selectFiles"
                control={control}
                rules={{ required: t("task.SelectFilesError") }}
                render={({ field }) => (
                  <TaskFiles
                    files={torrentFiles}
                    rowKey="idx"
                    selectedRowKeys={field.value ?? []}
                    onSelectionChange={field.onChange}
                    error={!!errors.selectFiles}
                    helperText={errors.selectFiles?.message}
                    height={200}
                  />
                )}
              />
            )}
          </>
        )}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, sm: useVortex ? 12 : 6 }}>
            <Controller
              name="out"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("common.Rename")}
                  fullWidth
                  size="small"
                  {...field}
                />
              )}
            />
          </Grid>
          {!useVortex && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="split"
                control={control}
                rules={{
                  min: { value: 1, message: t("task.SplitMin", { min: 1 }) },
                  max: {
                    value: 128,
                    message: t("task.SplitMax", { max: 128 }),
                  },
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={t("task.Splits")}
                    error={!!errors.split}
                    helperText={errors.split?.message}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                      )
                    }
                  />
                )}
              />
            </Grid>
          )}
          <Grid size={12}>
            <Controller
              name="dir"
              control={control}
              render={({ field }) => (
                <HistoryPathInput
                  setValue={(value) => setValue("dir", value)}
                  openTitle="task.DirPick"
                  {...field}
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="userAgent"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("task.UserAgent")}
                  placeholder={t("common.Optional")}
                  helperText={t("task.UserAgentHint")}
                  fullWidth
                  size="small"
                  {...field}
                />
              )}
            />
          </Grid>
        </Grid>
      </Box>
    </BaseDialog>
  );
}

export default AddTaskDialog;
