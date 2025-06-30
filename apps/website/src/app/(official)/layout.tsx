import { Copyright } from "@tauri-motrix/ux-base";
import Image from "next/image";

import MenuButton from "@/components/MenuButton";
import NavItem from "@/components/NavItem";
import { NAV_LIST } from "@/constants/nav";

export default function OfficialLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex flex-col">
      <header className="px-12 h-20 flex items-center justify-between sticky">
        <Image
          className="dark:invert"
          width={62}
          height={14}
          alt="Tauri Motrix logo"
          src="/logo.svg"
          priority
        />
        <MenuButton />
      </header>
      <nav className="flex flex-wrap *:flex-[1_1_33.3%]">
        {NAV_LIST.map((item) => (
          <NavItem key={item.href} href={item.href}>
            {item.title}
          </NavItem>
        ))}
      </nav>
      <main className="flex-[1_1_1px]">{children}</main>
      <footer className="px-12 h-15 flex gap-[24px] flex-wrap items-center ">
        <Copyright />
      </footer>
    </div>
  );
}
