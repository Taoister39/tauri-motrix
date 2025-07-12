import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";

import ElegantDarkButton from "@/components/ElegantDarkButton";
import NewVersion from "@/components/NewVersion";
import ViewFeatures from "@/components/ViewFeatures";
import WithPosterLayout from "@/components/WithPosterLayout";
import { APP_REPO, LATEST_RELEASE } from "@/constants/base_link";

export default async function Home() {
  const latest = await fetch(LATEST_RELEASE, {
    next: {
      revalidate: 60 * 60, // github api limit
    },
  }).then((res) => res.json());

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
      <p className="mb-4 text-sm">
        Support downloading HTTP, FTP, BitTorrent, Magnet, etc.
      </p>

      <section className="flex gap-4 items-center flex-col sm:flex-row">
        <Link href="/download">
          <ElegantDarkButton>Download</ElegantDarkButton>
        </Link>
        <NewVersion
          className="ml-2 hover:text-[#5c5edc]"
          href={latest.html_url}
        >
          {latest.tag_name}
        </NewVersion>
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
