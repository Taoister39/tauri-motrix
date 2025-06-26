import { styled } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import BasePage from "@/components/BasePage";

const TheIframe = styled("iframe")`
  width: 100%;
  height: 100%;
  border: none;
  overflow: hidden;
`;

const ORIGIN = "http://localhost:3000";

function LabPage() {
  const { t } = useTranslation();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== ORIGIN) return;

      console.log("onMessage ", event.data);
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <BasePage title={t("Lab")} full>
      <TheIframe src={`${ORIGIN}/lab-content`} ref={iframeRef} />
    </BasePage>
  );
}

export default LabPage;
