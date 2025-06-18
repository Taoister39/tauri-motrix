import Button from "@/components/Button";
import Copyright from "@/components/Copyright";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Logo />
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
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <Copyright />
      </footer>
    </div>
  );
}
