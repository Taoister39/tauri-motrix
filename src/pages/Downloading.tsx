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
} from "@mui/material";
import { emit } from "@tauri-apps/api/event";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useLockFn } from "ahooks";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import AddTorrentDialog from "@/business/task/AddTorrentDialog";
import TaskBanner from "@/business/task/TaskBanner";
import TaskItem from "@/business/task/TaskItem";
import { BasePageColumn, Column } from "@/client/styled_compose";
import { TaskList } from "@/client/task_compose";
import { DialogRef } from "@/components/BaseDialog";
import BasePage from "@/components/BasePage";
import { Notice } from "@/components/Notice";
import { NORMAL_STATUS } from "@/constant/task";
import { ADD_DIALOG } from "@/constant/url";
import { addTaskApi } from "@/services/aria2c_api";
import { useTaskStore } from "@/store/task";

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
  } = useTaskStore();

  const torrentRef = useRef<DialogRef>(null);
  const searchRef = useRef<string>("");

  const addTaskByClipboard = useLockFn(async () => {
    try {
      const content = await readText();
      await addTaskApi(content, {});
    } catch (e) {
      // @ts-expect-error string or any
      Notice.error(e.message ?? e);
    }
  });

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
      <BasePageColumn>
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
      </BasePageColumn>
      <AddTorrentDialog ref={torrentRef} />
    </BasePage>
  );
}

export default DownloadingPage;
