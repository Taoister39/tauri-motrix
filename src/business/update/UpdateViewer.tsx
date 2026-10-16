import { Box, Button, LinearProgress } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Update } from "@tauri-apps/plugin-updater";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

import { BaseDialog } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { APP_REPO } from "@/constant/url";
import { stopEngine } from "@/services/cmd";

function UpdateViewer({
  updateInfo,
  open,
  onClose,
}: {
  updateInfo: Update;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState(0);
  const [updateState, setUpdateState] = useState(false);
  const [buffer, setBuffer] = useState(0);

  const markdownContent = useMemo(() => {
    if (!updateInfo?.body) {
      return t("update.NewVersionAvailable");
    }
    return updateInfo?.body;
  }, [updateInfo, t]);

  // ! this cannot be updated
  const breakChangeFlag = useMemo(
    () => markdownContent.toLowerCase().includes("break change"),
    [markdownContent],
  );

  const onUpdate = async () => {
    if (!updateInfo) {
      return;
    }

    if (breakChangeFlag) {
      Notice.error(t("update.BreakChangeUpdateError"));
      return;
    }

    setUpdateState(true);

    try {
      // Stop aria2 engine before updating
      // TODO: graceful to kill sidecar before app exit
      await stopEngine();

      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            setContentLength(event.data.contentLength || 0);
            console.log(
              `started downloading ${event.data.contentLength} bytes`,
            );
            break;
          case "Progress":
            setDownloaded((prev) => prev + event.data.chunkLength);
            setBuffer(event.data.chunkLength);
            console.log(`downloaded ${downloaded} from ${contentLength}`);
            break;
          case "Finished":
            console.log("download finished");
            break;
        }
      });
    } catch (err: unknown) {
      Notice.error(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdateState(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      title={
        <Box display="flex" justifyContent="space-between">
          {t("update.NewVersionTitle", { version: updateInfo.version })}
          <Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                openUrl(`${APP_REPO}/releases/tag/v${updateInfo?.version}`);
              }}
            >
              {t("update.GotoReleasePage")}
            </Button>
          </Box>
        </Box>
      }
      contentSx={{ minWidth: 360, maxWidth: 400, height: "50vh" }}
      okBtn={t("common.Update")}
      cancelBtn={t("common.Cancel")}
      onClose={() => {
        if (!updateState) onClose();
      }}
      onCancel={() => {
        if (!updateState) onClose();
      }}
      loading={updateState}
      onOk={onUpdate}
    >
      <Box sx={{ height: "calc(100% - 10px)", overflow: "auto" }}>
        <ReactMarkdown
          components={{
            a: (props) => {
              const { children } = props;
              return (
                <a {...props} target="_blank">
                  {children}
                </a>
              );
            },
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </Box>
      {updateState && (
        <LinearProgress
          variant="buffer"
          value={(downloaded / contentLength) * 100}
          valueBuffer={buffer}
          sx={{ marginTop: "5px" }}
        />
      )}
    </BaseDialog>
  );
}

export default UpdateViewer;
