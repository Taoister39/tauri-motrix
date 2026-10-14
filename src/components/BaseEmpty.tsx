import { InboxRounded } from "@mui/icons-material";
import { EmptyState } from "@tauri-motrix/ux-base/components";
import { useTranslation } from "react-i18next";

import { UxThemeBridge } from "./UxThemeBridge";

interface Props {
  text?: string;
  extra?: React.ReactNode;
}

export function BaseEmpty({ text, extra }: Props) {
  const { t } = useTranslation();

  return (
    <UxThemeBridge style={{ width: "100%", height: "100%" }}>
      <EmptyState
        text={t(text ?? "common.Empty")}
        icon={<InboxRounded fontSize="inherit" />}
        action={extra}
      />
    </UxThemeBridge>
  );
}
