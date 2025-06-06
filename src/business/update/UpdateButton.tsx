import { Button } from "@mui/material";
import { check } from "@tauri-apps/plugin-updater";
import { useRef } from "react";
import useSWR from "swr";

import UpdateViewer from "@/business/update/UpdateViewer";
import { DialogRef } from "@/components/BaseDialog";
import { useMotrix } from "@/hooks/motrix";

function UpdateButton(props: { className?: string }) {
  const viewerRef = useRef<DialogRef>(null);
  const { motrix } = useMotrix();
  const auto_check_update = !!motrix?.auto_check_update;

  const { data: updateInfo } = useSWR(
    auto_check_update || auto_check_update === null ? "checkUpdate" : null,
    check,
    {
      errorRetryCount: 2,
      revalidateIfStale: false,
      focusThrottleInterval: 36e5, // 1 hour
    },
  );

  if (!updateInfo) {
    return null;
  }

  return (
    <>
      <UpdateViewer ref={viewerRef} />
      <Button
        className={props.className}
        color="error"
        variant="contained"
        size="small"
        onClick={() => viewerRef.current?.open()}
      >
        New
      </Button>
    </>
  );
}

export default UpdateButton;
