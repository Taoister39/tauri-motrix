import Image from "next/image";

import ElegantDarkButton from "@/components/ElegantDarkButton";

export default function Home() {
  return (
    <div className="relative h-full flex items-center">
      <article className="px-[8vw]">
        <div className="p-3.5">
          <Image
            width={220}
            height={220}
            src="/app-icon.png"
            alt="App Icon"
            className="rounded-4xl"
          />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          A full-featured download manager
        </h1>
        <p className="mb-4 text-sm">
          Support downloading HTTP, FTP, BitTorrent, Magnet, etc.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <ElegantDarkButton>Download</ElegantDarkButton>
        </div>
      </article>
      <figure className="absolute left-[60vw] bottom-[6vh]">
        <Image
          src="/screenshot-task-list-downloading-en.png"
          width={898}
          height={752}
          alt="Screenshot"
          priority
          unoptimized
        />
      </figure>
    </div>
  );
}
