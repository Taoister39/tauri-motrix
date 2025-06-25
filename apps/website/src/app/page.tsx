import Image from "next/image";

import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="px">
      <article>
        <Image width={234} height={234} src="/app-icon.png" alt="App Icon" />
        <h1 className="mb-2 tracking-[-.01em]">
          A full-featured download manager
        </h1>
        <p className="tracking-[-.01em]">
          Support downloading HTTP, FTP, BitTorrent, Magnet, etc.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Button>Download</Button>
        </div>
      </article>
      <aside></aside>
    </div>
  );
}
