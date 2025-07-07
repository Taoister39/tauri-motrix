import { Box, Button, LinearProgress } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import useSWR from "swr";

import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { APP_REPO } from "@/constant/url";
import { stopEngine } from "@/services/cmd";

function UpdateViewer(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();

  const [open, { setTrue, setFalse }] = useBoolean();

  useImperativeHandle(props.ref, () => ({ close: setFalse, open: setTrue }));

  const { data: updateInfo } = useSWR("checkUpdate", checkUpdate, {
    errorRetryCount: 2,
    revalidateIfStale: false,
    focusThrottleInterval: 36e5, // 1 hour
  });

  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState(0);
  const [updateState, setUpdateState] = useState(false);
  const [buffer, setBuffer] = useState(0);

  const markdownContent = useMemo(() => {
    if (!updateInfo?.body) {
      return "New Version is available";
    }
    return updateInfo?.body;
  }, [updateInfo]);

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
    } catch (err) {
      // @ts-expect-error show message
      Notice.error(err?.message || err.toString());
    } finally {
      setUpdateState(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      title={
        <Box display="flex" justifyContent="space-between">
          {`New Version v${updateInfo?.version}`}
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
      onClose={setFalse}
      onCancel={setFalse}
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
