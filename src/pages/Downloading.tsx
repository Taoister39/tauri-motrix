import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import LinkIcon from "@mui/icons-material/Link";
import {
  Box,
  Button,
  ButtonGroup,
  inputBaseClasses,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  TextField,
  Typography,
} from "@mui/material";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useLockFn } from "ahooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import AddTorrentDialog from "@/business/task/AddTorrentDialog";
import TaskBanner from "@/business/task/TaskBanner";
import TaskItem from "@/business/task/TaskItem";
import { BasePageColumn, Column } from "@/client/styled_compose";
import { TaskList } from "@/client/task_compose";
import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import BasePage from "@/components/BasePage";
import { Notice } from "@/components/Notice";
import { DOWNLOAD_ENGINE, NORMAL_STATUS } from "@/constant/task";
import { ADD_DIALOG } from "@/constant/url";
import { useAria2 } from "@/hooks/aria2";
import { addTaskApi, addTorrentApi } from "@/services/aria2c_api";
import { readFileAsBase64 } from "@/services/cmd";
import { addOneDir, findOneDirByPath } from "@/services/save_to_history";
import { useTaskStore } from "@/store/task";
import { compactUndefined } from "@/utils/compact_undefined";

function DownloadingPage() {
  const { t } = useTranslation();

  const {
    tasks,
    selectedTaskIds,
    fetchType,
    handleTaskSelect,
    handleTaskPause,
    handleTaskResume,
    handleTaskDelete,
    openTaskFile,
    copyTaskLink,
    setFetchType,
    setKeyword,
    fetchTasks,
  } = useTaskStore();

  const torrentRef = useRef<DialogRef>(null);
  const searchRef = useRef<string>("");
  const [dragOver, setDragOver] = useState(false);
  /** Paths from Tauri file drop (native drag-drop gives paths, not File objects) */
  const [pendingTorrentPaths, setPendingTorrentPaths] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { aria2 } = useAria2();

  const addTaskByClipboard = useLockFn(async () => {
    try {
      const content = await readText();
      await addTaskApi(content, {});
    } catch (e) {
      // @ts-expect-error string or any
      Notice.error(e.message ?? e);
    }
  });

  /** Process torrent files by path (from Tauri native file drop). */
  const processTorrentPaths = useLockFn(async (paths: string[]) => {
    if (paths.length === 0) return;

    try {
      const dir = aria2?.dir ?? "";
      let successCount = 0;
      let errorCount = 0;

      for (const path of paths) {
        try {
          const torrent = await readFileAsBase64(path);
          await addTorrentApi(torrent, compactUndefined({ dir }));

          const dirRecord = await findOneDirByPath(dir);
          if (!dirRecord && dir) {
            await addOneDir({
              dir,
              engine: DOWNLOAD_ENGINE.Aria2,
            });
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to add torrent ${path}:`, error);
          errorCount++;
        }
      }

      await fetchTasks();
      mutate("getSaveToHistory");

      if (successCount > 0) {
        Notice.success(t("task.AddTorrentSuccess", { count: successCount }));
      }
      if (errorCount > 0) {
        Notice.error(t("task.AddTorrentError", { count: errorCount }));
      }
    } catch (error) {
      console.error("Error processing torrent files:", error);
      // @ts-expect-error string or any
      Notice.error(error.message ?? t("task.ProcessTorrentError"));
    } finally {
      setConfirmDialogOpen(false);
      setPendingTorrentPaths([]);
    }
  });

  const handleConfirmAddTorrents = useCallback(() => {
    processTorrentPaths(pendingTorrentPaths);
  }, [pendingTorrentPaths, processTorrentPaths]);

  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === "over") {
        setDragOver(true);
      } else if (payload.type === "drop") {
        setDragOver(false);
        const paths = payload.paths ?? [];
        const torrentPaths = paths.filter((p) =>
          p.toLowerCase().endsWith(".torrent"),
        );
        if (torrentPaths.length > 0) {
          setPendingTorrentPaths(torrentPaths);
          setConfirmDialogOpen(true);
        }
      } else {
        setDragOver(false);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  return (
    <BasePage
      full
      title={t("Task-Start")}
      header={
        <ButtonGroup size="small">
          {NORMAL_STATUS.map((value) => (
            <Button
              key={value}
              variant={value === fetchType ? "contained" : "outlined"}
              onClick={() => setFetchType(value)}
              sx={{ textTransform: "capitalize" }}
            >
              {t(`Button-Fetch-Type.${value}`)}
            </Button>
          ))}
        </ButtonGroup>
      }
      fab={
        <SpeedDial
          ariaLabel="add task fab"
          sx={{ position: "absolute", bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<LinkIcon />}
            onClick={() => emit(ADD_DIALOG)}
            title={t("common.FromUrl")}
          />
          <SpeedDialAction
            icon={<FilePresentIcon />}
            title={t("common.FromTorrentFile")}
            onClick={() => torrentRef.current?.open()}
          />
          <SpeedDialAction
            icon={<ContentPasteIcon />}
            title={t("common.FromClipboard")}
            onClick={addTaskByClipboard}
          />
        </SpeedDial>
      }
    >
      <BasePageColumn
        sx={{
          position: "relative",
          outline: dragOver ? "2px dashed #1976d2" : "none",
          outlineOffset: "-2px",
          transition: "outline 0.2s",
        }}
      >
        <Column
          sx={(theme) => ({
            bgcolor: theme.palette.background.paper,
            px: 2,
            py: 1,
            gap: 1,
          })}
        >
          <TextField
            fullWidth
            size="small"
            sx={(theme) => ({
              [`.${inputBaseClasses.root}`]: {
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #424242"
                    : "1px solid #e0e0e0",
                borderRadius: "24px",
                fontSize: "16px",
                background:
                  theme.palette.mode === "light" ? "#f8f9fa" : "#2d2d2d",
                transition: "all 0.2s",
              },
            })}
            onChange={(e) => {
              const value = e.target.value;

              if (value.length === 0) {
                setKeyword(value);
              }
              searchRef.current = value;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setKeyword(searchRef.current);
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <span
                    onClick={() => setKeyword(searchRef.current)}
                    style={{
                      cursor: "pointer",
                      // color: "#757575",
                      fontSize: "20px",
                    }}
                  >
                    🔍
                  </span>
                ),
              },
            }}
            placeholder={t("task.SearchPlaceholder")}
          />
          <TaskBanner
            onSelectAll={handleTaskSelect}
            onPause={handleTaskPause}
            onResume={handleTaskResume}
            onStop={handleTaskDelete}
            selectedTaskIds={selectedTaskIds}
            fetchType={fetchType}
          />
        </Column>
        <Box
          sx={{
            padding: "10px",
            overflow: "auto",
            flex: "1 1 1px",
          }}
        >
          <TaskList
            dataSource={tasks}
            renderItem={(task) => (
              <TaskItem
                onCopyLink={copyTaskLink}
                onStop={handleTaskDelete}
                onResume={handleTaskResume}
                onPause={handleTaskPause}
                onOpenFile={openTaskFile}
                key={task.gid}
                task={task}
                onSelect={handleTaskSelect}
                selected={selectedTaskIds.includes(task.gid)}
              />
            )}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            textAlign: "center",
            display: "block",
            px: 2,
            py: 1,
          }}
        >
          {t("task.DragTorrentHint")}
        </Typography>
      </BasePageColumn>
      <AddTorrentDialog ref={torrentRef} />
      <BaseDialog
        open={confirmDialogOpen}
        title={t("task.ConfirmAddTorrentsTitle")}
        okBtn={t("common.Ok")}
        cancelBtn={t("common.Cancel")}
        onOk={handleConfirmAddTorrents}
        onCancel={() => {
          setConfirmDialogOpen(false);
          setPendingTorrentPaths([]);
        }}
        onClose={() => {
          setConfirmDialogOpen(false);
          setPendingTorrentPaths([]);
        }}
      >
        <Typography sx={{ mb: 1 }}>
          {t("task.ConfirmAddTorrentsMessage", {
            count: pendingTorrentPaths.length,
          })}
        </Typography>
        <Box
          component="ul"
          sx={{
            m: 0,
            pl: 2.5,
            pr: 1,
            fontSize: "0.875rem",
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          {pendingTorrentPaths.map((path) => (
            <li key={path}>{path.replace(/^.*[/\\]/, "")}</li>
          ))}
        </Box>
      </BaseDialog>
    </BasePage>
  );
}

export default DownloadingPage;
