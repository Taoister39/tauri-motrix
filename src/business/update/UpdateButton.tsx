import { Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import { useMotrix } from "@/hooks/motrix";
import { fetchUpdate, useUpdateStore } from "@/services/updates";

function UpdateButton(props: { className?: string }) {
  const { t } = useTranslation();
  const updateInfo = useUpdateStore((state) => state.update);
  const { motrix } = useMotrix();
  const auto_check_update = !!motrix?.auto_check_update;

  useSWR(auto_check_update ? "checkUpdate" : null, fetchUpdate, {
    errorRetryCount: 2,
    revalidateIfStale: false,
    focusThrottleInterval: 36e5, // 1 hour
  });

  if (!updateInfo) {
    return null;
  }

  return (
    <Button
      className={props.className}
      color="error"
      variant="contained"
      size="small"
      onClick={() => useUpdateStore.setState({ open: true })}
    >
      {t("update.New")}
    </Button>
  );
}

export default UpdateButton;
