"use client";
import { Copyright } from "@tauri-motrix/ux-base";
import clsx from "clsx";
import Image from "next/image";
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

  return (
    <div className="h-screen flex flex-col">
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
      <nav
        className={clsx(
          open ? "flex" : "hidden",
          "flex-wrap md:*:flex-[1_1_33.3%] sm:*:flex-[1_1_50%] sm:flex-row flex-col",
        )}
      >
        {NAV_LIST.map((item) => (
          <NavItem key={item.href} href={item.href}>
            {item.title}
          </NavItem>
        ))}
      </nav>
      <div className="flex-[1_1_1px] relative">
        <main
          className={clsx(
            "h-full z-130",
            !open
              ? "[transform:translate3d(0px,0px,0px)]"
              : "translate-y-[60vh] translate-z-[-200px]",
          )}
        >
          {children}
        </main>
        <div
          className={clsx(
            "h-full w-full bg-white absolute top-0 shadow-inner transition-transform duration-400 ease-[cubic-bezier(.6,0,.4,1)]",
            open ? "block" : "hidden",
            open
              ? "translate-y-[60vh] translate-z-[-250px]"
              : "translate-y-[100%]",
            { "overflow-hidden": open },
            "z-120 opacity-90",
          )}
        />
        <div
          className={clsx(
            "h-full w-full bg-white absolute",
            open ? "block" : "hidden",
            open
              ? "translate-y-[60vh] translate-z-[-300px]"
              : "translate-y-[100%]",
            { "overflow-hidden": open },
            "z-110 opacity-80",
          )}
        />
      </div>
      <footer className="px-12 h-15 flex gap-[24px] flex-wrap items-center justify-center lg:justify-start">
        <Copyright />
      </footer>
    </div>
  );
}
