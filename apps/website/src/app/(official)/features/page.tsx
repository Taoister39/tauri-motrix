import OpenLink from "@/components/OpenLink";
import { URL_FOR_RELEASE } from "@/constants/base_link";

function FeaturesPage() {
  return (
    <article className="px-[8vw] py-6 pb-10 max-w-5xl">
      <h1 className="text-3xl font-bold pb-4">Features</h1>
      <p className="mb-6">
        A free, open-source download manager for Windows, macOS, and Linux, with
        x64 and ARM64 builds on all three platforms.
      </p>

      <section className="my-6">
        <h2 className="text-xl font-bold mb-3">Two engines, one task list</h2>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            aria2 is the default engine for HTTP, FTP, BitTorrent, and magnet
            downloads, with up to 128 threads per task and speed limits.
          </li>
          <li>
            Vortex (Beta) is a native Rust engine for HTTP(S) files, with
            segmented downloads, pause/resume, automatic retries, and recovery
            after unexpected shutdowns. Enable it in Settings → Vortex.
          </li>
          <li>
            Switching engines affects new HTTP(S) tasks only. Existing tasks
            keep their original engine; torrents, magnet links, other protocols,
            and external RPC controllers continue to use aria2.
          </li>
          <li>
            Both engines share task lists, download history, and notifications.
          </li>
        </ul>
      </section>

      <section className="my-6">
        <h2 className="text-xl font-bold mb-3">Add and manage downloads</h2>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            Add URLs and import torrent files in one dialog, with download
            options and directory history. Paste links from the clipboard or
            choose which files to download from a torrent.
          </li>
          <li>
            Drop multiple .torrent files onto the Downloading page, confirm your
            selection, and create tasks in a batch.
          </li>
          <li>
            Find failed tasks in the Failed category, view failure reasons, and
            retry downloads with either engine. aria2 retries preserve download
            options and resume existing files.
          </li>
          <li>
            Customize User-Agent per task in either engine; leave it empty to
            use the engine default.
          </li>
          <li>Manage tracker lists and proxy settings for aria2 downloads.</li>
        </ul>
      </section>

      <section className="my-6">
        <h2 className="text-xl font-bold mb-3">Connect and customize</h2>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            Connect third-party download tools using configurable aria2 RPC
            ports and secrets. Copy the connection address in Settings → Aria2
            Engine → RPC Settings.
          </li>
          <li>
            Enable &ldquo;Minimize to tray on auto launch&rdquo; in Settings →
            Display to start in the tray at login. It is off by default; manual
            launches still show the window.
          </li>
          <li>Use a Material Design interface with light and dark themes.</li>
        </ul>
      </section>

      <p className="mt-8">
        For v0.2.5 fixes to speed charts, batch deletion, notifications, and
        UPnP, read the{" "}
        <OpenLink href={`${URL_FOR_RELEASE}/tag/v0.2.5`}>
          v0.2.5 release notes
        </OpenLink>
        .
      </p>
    </article>
  );
}

export default FeaturesPage;
