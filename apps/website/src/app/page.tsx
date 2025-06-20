import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
      <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
        <li className="mb-2 tracking-[-.01em]">
          A full-featured download manager
        </li>
        <li className="tracking-[-.01em]">
          Support downloading HTTP, FTP, BitTorrent, Magnet, etc.
        </li>
      </ol>

      <div className="flex gap-4 items-center flex-col sm:flex-row">
        <Button>Download</Button>
      </div>
    </div>
  );
}
