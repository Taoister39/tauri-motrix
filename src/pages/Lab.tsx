import { styled } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import BasePage from "@/components/BasePage";
import { APP_WEBSITE_ORIGIN } from "@/constant/url";
import { useMotrix } from "@/hooks/motrix";
import { getLanguage } from "@/services/i18n";

const TheIframe = styled("iframe")`
  width: 100%;
  height: 100%;
  border: none;
  overflow: hidden;
  background: ${({ theme }) => theme.palette.background.paper};
`;

// In a development environment, you can replace it with http://localhost:3000
const ORIGIN = APP_WEBSITE_ORIGIN;

export interface BaseMessage {
  type: string;
  data: unknown;
}

function LabPage() {
  const { t, i18n } = useTranslation();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { motrix } = useMotrix();

  const language = useMemo(
    () => getLanguage(motrix?.language ?? i18n.language),
    [i18n.language, motrix?.language],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<BaseMessage>) => {
      if (event.origin !== ORIGIN) return;

      const { data: payload } = event;

      console.log("lab page receive iframe message ", payload);

      if (payload.type === "open_url") {
        const url = payload.data as string;
        openUrl(url);
      }
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <BasePage title={t("Lab")} full>
      <TheIframe
        src={`${ORIGIN}/lab-content?lang=${language}`}
        ref={iframeRef}
        allowFullScreen
      />
    </BasePage>
  );
}

export default LabPage;
