import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";

import ElegantDarkButton from "@/components/ElegantDarkButton";
import OpenLink from "@/components/OpenLink";
import { LATEST_RELEASE, URL_FOR_RELEASE } from "@/constants/base_link";

type Target = "nsis";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface LatestRelease {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

async function DownloadPage() {
  const latest: LatestRelease = await fetch(LATEST_RELEASE, {
    next: {
      revalidate: 60 * 60, // github api limit
    },
  }).then((res) => res.json());

  // TODO: It's no robust.
  const version = latest.tag_name.slice(1);

  const downloadMap = latest.assets.reduce(
    (acc, asset) => {
      if (asset.name.endsWith("x64-setup.exe")) {
        acc.nsis ??= [];
        acc.nsis.push({ href: asset.browser_download_url, name: "x64" });
      }

      if (asset.name.endsWith("arm64-setup.exe")) {
        acc.nsis ??= [];
        acc.nsis.push({ href: asset.browser_download_url, name: "arm64" });
      }

      return acc;
    },
    {} as Record<Target, Array<{ href: string; name: string }> | undefined>,
  );

  return (
    <div className="md:flex px-[8vw]">
      <aside className="flex-5">
        <div className="p-3.5">
          <Image
            alt="App Icon"
            width={140}
            height={140}
            src="/app-icon.png"
            className="rounded-4xl"
          />
          <p className="my-4">Version: {version}</p>
          <p>Release date: {dayjs(latest.published_at).format("YYYY/MM/DD")}</p>

          <div className="my-4">
            <OpenLink href={latest.html_url}>Release notes</OpenLink>
          </div>
          <div className="pt-4">
            <OpenLink href={URL_FOR_RELEASE}>Other versions</OpenLink>
          </div>
        </div>
      </aside>
      <article className="flex-15">
        <h1 className="text-3xl font-bold py-4">Download Motrix</h1>

        {downloadMap?.nsis && (
          <>
            <h2 className="font-bold my-4">NSIS Installer</h2>
            <div className="pl-10 flex flex-wrap gap-8">
              {downloadMap.nsis.map((item) => (
                <Link key={item.href} href={item.href}>
                  {/* // TODO: remove !important */}
                  <ElegantDarkButton className="px-6 py-2! text-sm w-auto inline-flex items-center gap-2">
                    {item.name}
                    <FontAwesomeIcon icon={faArrowDown} className="text-sm" />
                  </ElegantDarkButton>
                </Link>
              ))}
            </div>
          </>
        )}

        <h3 className="font-bold my-4">System requirements</h3>
        <ul className="list-disc pl-10 mt-4 mb-6 *:pb-2">
          <li>64-bit versions of Microsoft Windows 11, 10</li>
          <li>1 GB free RAM minimum, 8 GB of total system RAM recommended</li>
          <li>1 GB hard disk space, SSD recommended</li>
          <li>1024x768 minimum screen resolution</li>
        </ul>

        <h3 className="font-bold my-4">Installation instructions</h3>
        <ol className="list-decimal pl-10 mt-4 mb-6 *:pb-2">
          <li>
            Download the Tauri.Motrix_{version}_arm64-setup.exe installer file
          </li>
          <li>
            Run the Tauri.Motrix_{version}_arm64-setup.exe file that starts the
            Installation Wizard
          </li>
          <li>
            Follow all steps suggested by the wizard. Please pay special
            attention to the corresponding installation options
          </li>
        </ol>
      </article>
    </div>
  );
}

export default DownloadPage;
