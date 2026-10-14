import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";

import OpenLink from "@/components/OpenLink";
import ReleaseUnavailable from "@/components/ReleaseUnavailable";
import { URL_FOR_RELEASE } from "@/constants/base_link";
import {
  Architecture,
  classifyReleaseAssets,
  getLatestRelease,
  PackageFormat,
  Platform,
} from "@/lib/release";

const PLATFORMS: { id: Platform; name: string }[] = [
  { id: "windows", name: "Windows" },
  { id: "macos", name: "macOS" },
  { id: "linux", name: "Linux" },
];
const ARCHITECTURES: Architecture[] = ["x64", "arm64"];
const FORMATS: Record<Platform, PackageFormat[]> = {
  windows: ["exe"],
  macos: ["dmg"],
  linux: ["deb", "appimage"],
};
const FORMAT_LABELS: Record<PackageFormat, string> = {
  exe: "EXE installer",
  dmg: "DMG",
  deb: "DEB",
  appimage: "AppImage",
};

function PlatformInstructions({ platform }: { platform: Platform }) {
  if (platform === "windows") {
    return (
      <>
        <p>Windows 10 or 11 on an x64 or ARM64 processor.</p>
        <ol className="list-decimal pl-6 mt-3 space-y-2">
          <li>Download the EXE installer for your processor.</li>
          <li>Run the installer and follow the setup wizard.</li>
        </ol>
      </>
    );
  }
  if (platform === "macos") {
    return (
      <>
        <p>macOS on an Intel or Apple Silicon Mac.</p>
        <ol className="list-decimal pl-6 mt-3 space-y-2">
          <li>Download the DMG matching your Mac.</li>
          <li>Open the DMG and drag Tauri Motrix into Applications.</li>
          <li>Launch Tauri Motrix from Applications.</li>
        </ol>
        <p className="mt-3 text-sm">
          If macOS prevents the app from opening, see{" "}
          <OpenLink href="https://support.apple.com/en-au/102445">
            Apple&apos;s guide to safely opening apps
          </OpenLink>
          .
        </p>
      </>
    );
  }
  return (
    <>
      <p>
        A Linux desktop on an x64 or ARM64 processor. DEB packages are for
        Debian-based distributions; AppImage compatibility depends on your
        distribution&apos;s system libraries. See{" "}
        <OpenLink href="https://tauri.app/distribute/appimage/">
          Tauri&apos;s Linux compatibility guidance
        </OpenLink>
        .
      </p>
      <ul className="list-disc pl-6 mt-3 space-y-2">
        <li>
          DEB: download the package for your processor and install it with your
          distribution&apos;s package installer, or run{" "}
          <code className="break-all">
            sudo apt install ./&lt;downloaded-file&gt;.deb
          </code>{" "}
          from the download directory.
        </li>
        <li>
          AppImage: download the file for your processor, enable &ldquo;Allow
          executing file as program&rdquo; in its file properties, then open it.
          You can also run{" "}
          <code className="break-all">
            chmod +x ./&lt;downloaded-file&gt;.AppImage
          </code>{" "}
          and launch it from that directory.
        </li>
      </ul>
    </>
  );
}

async function DownloadPage() {
  const latest = await getLatestRelease();
  const downloads = classifyReleaseAssets(latest?.assets ?? []);

  return (
    <div className="md:flex gap-10 px-[8vw] pb-10">
      <aside className="md:w-52 md:shrink-0">
        <div className="p-3.5">
          <Image
            alt="App Icon"
            width={140}
            height={140}
            src="/app-icon.png"
            className="rounded-4xl"
          />
          {latest ? (
            <>
              <p className="my-4">Version: {latest.tag_name.slice(1)}</p>
              <p>
                Release date: {dayjs(latest.published_at).format("YYYY/MM/DD")}
              </p>
              <div className="my-4">
                <OpenLink href={latest.html_url}>Release notes</OpenLink>
              </div>
            </>
          ) : (
            <ReleaseUnavailable />
          )}
          <div className="pt-4">
            <OpenLink href={URL_FOR_RELEASE}>Other versions</OpenLink>
          </div>
        </div>
      </aside>
      <article className="flex-1 min-w-0 max-w-4xl">
        <h1 className="text-3xl font-bold py-4">Download Tauri Motrix</h1>
        <p className="mb-6">
          Choose a package for your operating system and processor. x64 is for
          Intel and AMD processors; ARM64 is for ARM processors. On macOS,
          choose Intel or Apple Silicon to match your Mac.
        </p>

        {PLATFORMS.map((platform) => {
          const packages = ARCHITECTURES.flatMap((architecture) =>
            FORMATS[platform.id].map((format) => ({
              architecture,
              format,
              download: downloads.find(
                (item) =>
                  item.platform === platform.id &&
                  item.architecture === architecture &&
                  item.format === format,
              ),
            })),
          );
          return (
            <section key={platform.id} className="mb-8">
              <h2 className="text-xl font-bold my-4">{platform.name}</h2>
              <div className="flex flex-wrap gap-3">
                {packages.map(({ architecture, format, download }) => {
                  const architectureLabel =
                    platform.id === "macos"
                      ? architecture === "x64"
                        ? "Intel (x64)"
                        : "Apple Silicon (ARM64)"
                      : architecture === "x64"
                        ? "x64"
                        : "ARM64";
                  const label = `${architectureLabel} · ${FORMAT_LABELS[format]}`;
                  return download ? (
                    <Link
                      key={`${architecture}-${format}`}
                      href={download.href}
                      aria-label={`Download Tauri Motrix for ${platform.name}: ${label}`}
                      className="px-6 py-3 bg-[#2b2b2b] font-bold text-white rounded-full text-sm inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                      {label}
                      <FontAwesomeIcon icon={faArrowDown} aria-hidden="true" />
                    </Link>
                  ) : (
                    <p
                      key={`${architecture}-${format}`}
                      className="px-4 py-3 border border-gray-300 rounded-2xl text-sm"
                    >
                      {label} — currently unavailable
                    </p>
                  );
                })}
              </div>
              {latest && packages.some((item) => !item.download) && (
                <p className="mt-3 text-sm">
                  Some packages are missing from this release. Check{" "}
                  <OpenLink href={latest.html_url}>
                    GitHub release assets
                  </OpenLink>{" "}
                  or <OpenLink href={URL_FOR_RELEASE}>other releases</OpenLink>.
                </p>
              )}
              <h3 className="font-bold mt-5 mb-2">
                Requirements and installation
              </h3>
              <PlatformInstructions platform={platform.id} />
            </section>
          );
        })}
      </article>
    </div>
  );
}

export default DownloadPage;
