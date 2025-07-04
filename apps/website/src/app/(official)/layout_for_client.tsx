"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Copyright } from "@tauri-motrix/ux-base";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

import MenuButton from "@/components/MenuButton";
import NavItem from "@/components/NavItem";
import { useStackPageOpen } from "@/components/StackPageProviderWrapper";
import { NAV_LINK, NAV_LIST } from "@/constants/nav";

export default function OfficialLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { open, setOpen } = useStackPageOpen();

  const createPaper = (index: number) => {
    return (
      <section
        className={clsx(
          "min-h-screen w-full bg-white absolute top-0 shadow-inner transition-transform duration-400 ease-[cubic-bezier(.6,0,.4,1)]",
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
      className={clsx("min-h-screen", {
        "bg-[#ebecf0] overflow-hidden": open,
      })}
    >
      <header
        className={clsx(
          "px-12 h-15 md:h-20 flex items-center justify-between fixed top-0 left-0 right-0 z-1000",
          !open ? "bg-[hsla(0,0%,100%,.75)]" : "bg-transparent",
        )}
      >
        <Link href="/" className="cursor-pointer">
          <Image
            className="dark:invert"
            width={62}
            height={14}
            alt="Tauri Motrix logo"
            src="/logo.svg"
            priority
          />
        </Link>
        <MenuButton open={open} onClick={() => setOpen(!open)} />
      </header>
      <nav
        className={clsx(
          { hidden: !open },
          "absolute top-20 left-0 right-0 z-1000",
        )}
      >
        <section
          className={
            "grid gap-4 grid-cols-1 md:grid-cols-3 sm:grid-cols-2 gap-y-10 my-4"
          }
        >
          {NAV_LIST.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              setFalse={() => setOpen(false)}
            >
              {item.title}
            </NavItem>
          ))}
        </section>
        <section className="flex justify-center items-center gap-16 mt-10">
          {NAV_LINK.map((item) => (
            <Link href={item.href} key={item.href}>
              <FontAwesomeIcon
                icon={item.icon}
                className="text-2xl"
                color="#969799"
              />
            </Link>
          ))}
        </section>
      </nav>
      <div className="relative perspective-[1200px] perspective-origin-[50%_-50%]">
        <section
          className={clsx(
            "min-h-screen z-130 overflow-x-hidden transition-transform duration-400 ease-[cubic-bezier(.6,0,.4,1)]",
            !open
              ? "[transform:translate3d(0px,0px,0px)]"
              : "translate-y-[60vh] translate-z-[-200px] ",
            {
              "overflow-hidden bg-white relative": open,
            },
            "flex flex-col",
          )}
        >
          <main className="pt-20 flex-1">{children}</main>
          <footer className="px-12 pb-6 flex gap-[24px] flex-wrap items-center justify-center lg:justify-start">
            <Copyright />
          </footer>
        </section>
        {createPaper(1)}
        {createPaper(2)}
      </div>
    </div>
  );
}
