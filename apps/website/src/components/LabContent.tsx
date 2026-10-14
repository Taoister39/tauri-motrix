import clsx from "clsx";

import LabCard, { LabCardProps } from "@/components/LabCard";

// TODO: migrate to database
const LAB_LIST: LabCardProps[] = [
  {
    title: "YAAW for Chrome",
    repository: "https://github.com/acgotaku/YAAW-for-Chrome",
    cover: "/extensions/yaaw-for-chrome.png",
    author: "acgotaku",
    description:
      "Chrome version of YAAW, support right click to add to Motrix to download",
  },
  {
    repository:
      "https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn",
    cover: "/extensions/aria2-for-chrome.png",
    title: "Aria2 for Chrome",
    author: "alexhua",
    description:
      "Aria2 for chrome is a download task management extension customized for Chrome, which can automatically block or manually add download tasks",
  },
  {
    repository: "https://github.com/jae-jae/Camtd",
    cover: "/extensions/camtd.png",
    title: "Camtd",
    author: "jae-jae",
    description:
      "Camtd is a Chrome multi-threaded download manager extension that can take over Chrome's default download behavior",
  },
  {
    title: "Aria2 DMI",
    repository:
      "https://addons.mozilla.org/en-US/firefox/addon/aria2-integration",
    cover: "/extensions/aria2-integration.png",
    author: "Ross Wang",
    description: "Replace Firefox built-in download manager",
  },
];

export interface LabContentProps {
  onOpen?: (url: string) => void;
  className?: string;
}

function LabContent({ onOpen, className }: LabContentProps) {
  return (
    <div className={clsx("sm:px-9 px-5 sm:pb-4 pt-4 pb-3", className)}>
      <h1 className="text-3xl font-bold mb-2">Featured Extensions</h1>
      <section className="my-6 max-w-3xl">
        <h2 className="text-xl font-bold mb-3">Connect to Tauri Motrix</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Keep Tauri Motrix running and open Settings → Aria2 Engine → RPC
            Settings.
          </li>
          <li>
            Copy the RPC address into your extension or download tool. The
            default address is{" "}
            <code className="break-all">http://127.0.0.1:16801/jsonrpc</code>.
          </li>
          <li>
            Use the same port and RPC secret in both applications. If you change
            the port or secret in Tauri Motrix, update your extension as well.
          </li>
        </ol>
        <p className="mt-3">
          Saving RPC settings restarts aria2 and restores its saved task
          session. External controllers always use aria2, even when Vortex
          (Beta) is selected for new HTTP(S) tasks in the app.
        </p>
      </section>
      <section className="flex gap-12 flex-wrap">
        {LAB_LIST.map((item) => (
          <LabCard {...item} key={item.repository} onOpen={onOpen} />
        ))}
      </section>
    </div>
  );
}

export default LabContent;
