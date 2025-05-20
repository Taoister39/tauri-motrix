import { useBoolean } from "ahooks";
import { Ref, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";

import { BaseDialog, DialogRef } from "@/components/BaseDialog";

function TaskManagementDialog(props: { ref: Ref<DialogRef> }) {
  const { t } = useTranslation();
  const [open, { setTrue, setFalse }] = useBoolean();

  useImperativeHandle(props.ref, () => ({
    close: setFalse,
    open: setTrue,
  }));

  return (
    <BaseDialog
      title={t("setting.TaskManagement")}
      open={open}
      onClose={setFalse}
      onCancel={setFalse}
      okBtn={t("common.Save")}
      cancelBtn={t("common.Cancel")}
    >
      <span>TODO</span>
    </BaseDialog>
  );
}

export default TaskManagementDialog;
