import { styled, useTheme } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import BasePage from "@/components/BasePage";

const TheIframe = styled("iframe")`
  width: 100%;
  height: 100%;
  border: none;
  overflow: hidden;
`;

const ORIGIN = "http://localhost:3000";

export interface BaseMessage {
  type: string;
  data: unknown;
}

function LabPage() {
  const { t } = useTranslation();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isReady, setIsReady] = useState(false);

  const theme = useTheme();

  useEffect(() => {
    const onMessage = (event: MessageEvent<BaseMessage>) => {
      if (event.origin !== ORIGIN) return;

      const { data: payload } = event;

      console.log("lab page receive iframe message ", payload);

      if (payload.type === "open_url") {
        const url = payload.data as string;
        openUrl(url);
      }

      if (payload.type === "iframe_loaded") {
        setIsReady(true);
      }
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "update_theme",
          data: {
            background: theme.palette.background.paper,
          },
        },
        ORIGIN,
      );
    }
  }, [isReady, theme.palette.background.paper]);

  return (
    <BasePage title={t("Lab")} full>
      <TheIframe src={`${ORIGIN}/lab-content`} ref={iframeRef} />
    </BasePage>
  );
}

export default LabPage;
