import { useBoolean } from "ahooks";
import { Instance, remote } from "parse-torrent";
import { Ref, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";

import TaskFiles from "@/business/task/TaskFiles";
import { BaseDialog, DialogRef } from "@/components/BaseDialog";
import InputFileUpload from "@/components/InputFileUpload";
import { listTorrentFiles } from "@/utils/file";

function AddTorrentDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setFalse, setTrue }] = useBoolean();

  const [files, setFiles] = useState<Instance["files"]>([]);

  useImperativeHandle(props.ref, () => ({ close: setFalse, open: setTrue }));

  return (
    <BaseDialog
      open={open}
      title={t("common.DownloadFile")}
      okBtn={t("common.Submit")}
      cancelBtn={t("common.Cancel")}
      onCancel={setFalse}
      onClose={setFalse}
      disableOk={!files?.length}
      //   onOk={}
    >
      <InputFileUpload
        accept=".torrent"
        onChange={(files) => {
          if (!files.length) {
            return;
          }
          const file = files[0];

          remote(file, (err, parsedTorrent) => {
            if (err) throw err;

            setFiles(listTorrentFiles(parsedTorrent?.files));
          });
        }}
      />
      {!!files?.length && (
        <>
          <TaskFiles files={files}></TaskFiles>
        </>
      )}
    </BaseDialog>
  );
}

export default AddTorrentDialog;
