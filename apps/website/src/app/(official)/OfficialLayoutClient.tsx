"use client";
import { faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Copyright } from "@tauri-motrix/ux-base";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import MenuButton from "@/components/MenuButton";
import NavItem from "@/components/NavItem";
import { NAV_LIST } from "@/constants/nav";

export default function OfficialLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);

  const createPaper = (index: number) => {
    return (
      <div
        className={clsx(
          "h-full w-full bg-white absolute top-0 shadow-inner transition-transform duration-400 ease-[cubic-bezier(.6,0,.4,1)]",
          open ? "block" : "hidden",
          { "overflow-hidden": open },
        )}
        style={{
          transform: open
            ? `translate3d(0, 60vh, -${200 + 50 * index}px)`
            : "translateY(-100%)",
          zIndex: 130 - index * 10,
          opacity: 100 - index * 10,
        }}
      />
    );
  };

  return (
    <div
      className={clsx("h-screen flex flex-col", {
        "bg-[#ebecf0] overflow-hidden": open,
      })}
    >
      <header
        className={clsx(
          "px-12 h-20 flex items-center justify-between sticky",
          !open ? "bg-[hsla(0,0%,100%,.75)]" : "bg-transparent",
        )}
      >
        <Image
          className="dark:invert"
          width={62}
          height={14}
          alt="Tauri Motrix logo"
          src="/logo.svg"
          priority
        />
        <MenuButton open={open} onClick={() => setOpen(!open)} />
      </header>
      <nav className={clsx({ hidden: !open })}>
        <section
          className={
            "flex flex-wrap md:*:flex-[1_1_33.3%] sm:*:flex-[1_1_50%] sm:flex-row flex-col"
          }
        >
          {NAV_LIST.map((item) => (
            <NavItem key={item.href} href={item.href}>
              {item.title}
            </NavItem>
          ))}
        </section>
        <section className="flex justify-center items-center gap-4">
          <Link href="https://x.com/Taoister39">
            <FontAwesomeIcon icon={faTwitter} size="2x" />
          </Link>
          <Link href="https://github.com/Taoister39/tauri-motrix">
            <FontAwesomeIcon icon={faGithub} size="2x" />
          </Link>
        </section>
      </nav>
      <div className="flex-1 relative perspective-[1200px] perspective-origin-[50%_-50%]">
        <main
          className={clsx(
            "h-full z-130 overflow-x-hidden",
            !open
              ? "[transform:translate3d(0px,0px,0px)]"
              : "translate-y-[60vh] translate-z-[-200px] ",
            {
              "overflow-hidden bg-white relative": open,
            },
          )}
        >
          {children}
        </main>
        {createPaper(1)}
        {createPaper(2)}
      </div>
      <footer className="px-12 h-15 flex gap-[24px] flex-wrap items-center justify-center lg:justify-start">
        <Copyright />
      </footer>
    </div>
  );
}
