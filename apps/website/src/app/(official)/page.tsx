import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

import ElegantDarkButton from "@/components/ElegantDarkButton";
import NewVersion from "@/components/NewVersion";
import ViewFeatures from "@/components/ViewFeatures";
import { APP_REPO, LATEST_RELEASE } from "@/constants/base_link";

export default async function Home() {
  const latest = await fetch(LATEST_RELEASE, {
    next: {
      revalidate: 60 * 60, // github api limit
    },
  }).then((res) => res.json());

  return (
    <div className="h-full flex items-center flex-wrap px-[8vw] gap-4 py-10">
      <article>
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
          <ElegantDarkButton>Download</ElegantDarkButton>
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
      </article>
      <figure
        className={clsx(
          "lg:absolute lg:left-[60vw] lg:bottom-[6vh] lg:h-full w-full max-h-[80vh] ",
          "lg:hover:translate-x-[-18vw] transition-all duration-800 delay-100 ease-[cubic-bezier(.08,.82,.17,1)]",
          // "lg:after:shadow-[0_0_20px_0_rgba(0,0,0,0.075),0_25px_30px_0_rgba(0,0,0,0.175)] after:content-['']",
          // "after:h-full after:w-full after:left-0 after:top-0 after:absolute",
        )}
      >
        <Image
          src="/screenshot-task-list-downloading-en.png"
          width={898}
          height={752}
          alt="Screenshot"
          priority
          unoptimized
          className="w-auto h-auto max-w-full max-h-full"
        />
      </figure>
    </div>
  );
}
