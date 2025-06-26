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
      const { data: payload } = e;

      if (payload.type === "update_theme") {
        console.log("iframe sync_theme", payload);

        const newTheme = payload.data as Record<string, string> | undefined;
        const rootEle = document.documentElement;

        for (const key in newTheme) {
          rootEle.style.setProperty(`--${key}`, newTheme[key]);
        }
      }
    };

    window.addEventListener("message", onMessage);

    window.parent.postMessage({ type: "iframe_loaded" }, "*");

    return () => {
      window.removeEventListener("message", onMessage);
    };
  });

  return (
    <LabContent
      className="px-5 py-4"
      onOpen={(url) => {
        window.parent.postMessage({ type: "open_url", data: url }, "*");
      }}
    />
  );
}

export default LabPage;
