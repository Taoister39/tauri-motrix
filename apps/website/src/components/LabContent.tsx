"use client";
import LabCard, { LabCardProps } from "@/components/LabCard";

const LAB_LIST: LabCardProps[] = [
  {
    title: "YAAW for Chrome",
    repository: "https://github.com/acgotaku/YAAW-for-Chrome",
    cover: "/yaaw-for-chrome.png",
    author: "acgotaku",
    description:
      "Chrome version of YAAW, support right click to add to Motrix to download",
  },
  {
    repository:
      "https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn",
    cover: "/aria2-for-chrome.png",
    title: "Aria2 for Chrome",
    author: "alexhua",
    description:
      "Aria2 for chrome is a download task management extension customized for Chrome, which can automatically block or manually add download tasks",
  },
];

export interface LabContentProps {
  onOpen?: (url: string) => void;
  className?: string;
}

function LabContent({ onOpen, className }: LabContentProps) {
  return (
    <div className={className ?? "sm:px-9 px-5 sm:py-4 py-3"}>
      <h1 className="text-3xl font-bold mb-2">Featured Extensions</h1>
      <section className="flex gap-12 flex-wrap">
        {LAB_LIST.map((item) => (
          <LabCard {...item} key={item.repository} onOpen={onOpen} />
        ))}
      </section>
    </div>
  );
}

export default LabContent;
