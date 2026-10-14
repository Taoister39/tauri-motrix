import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";

import NewVersion from "@/components/NewVersion";
import ReleaseUnavailable from "@/components/ReleaseUnavailable";
import ViewFeatures from "@/components/ViewFeatures";
import WithPosterLayout from "@/components/WithPosterLayout";
import { APP_REPO } from "@/constants/base_link";
import { getLatestRelease } from "@/lib/release";

export default async function Home() {
  const latest = await getLatestRelease();

  return (
    <WithPosterLayout>
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
      <p className="mb-2 text-sm max-w-md">
        Available for Windows, macOS, and Linux, with x64 and ARM64 builds on
        every platform.
      </p>
      <p className="mb-4 text-sm max-w-md">
        Download HTTP, FTP, BitTorrent, and magnet links with aria2. Try Vortex
        (Beta), our native Rust engine for HTTP(S) downloads, alongside aria2 in
        one task list.
      </p>

      <section className="flex gap-4 items-center flex-col sm:flex-row">
        <Link
          href="/download"
          className="py-3 px-8 bg-[#2b2b2b] font-bold text-white rounded-full inline-flex justify-center focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Download
        </Link>
        {latest ? (
          <NewVersion
            className="ml-2 hover:text-[#5c5edc]"
            href={latest.html_url}
          >
            {latest.tag_name} release notes
          </NewVersion>
        ) : (
          <ReleaseUnavailable />
        )}
      </section>

      <section className="mt-4">
        <ViewFeatures />
      </section>

      <section className="mt-12 mb-4 hover:text-[#5c5edc]">
        <FontAwesomeIcon icon={faGithub} className="text-xl" />
        <Link href={APP_REPO} className="ml-2 ">
          It's free and open source, Welcome fork or PR.
        </Link>
      </section>
    </WithPosterLayout>
  );
}
