"use client";
import { useEffect } from "react";

import LabContent from "@/components/LabContent";

interface BaseData {
  type: string;
  data: unknown;
}

function LabPage() {
  useEffect(() => {
    const onMessage = (e: MessageEvent<BaseData>) => {
      const { data } = e;
      if (data.type === "update_theme") {
        console.log("sync_theme");

        const newTheme = data.data as {
          background?: string;
          foreground?: string;
        };

        const rootEle = document.documentElement;

        if (newTheme?.background) {
          rootEle.style.setProperty("--background", newTheme.background);
        }

        if (newTheme?.foreground) {
          rootEle.style.setProperty("--foreground", newTheme.foreground);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return <LabContent />;
}

export default LabPage;
