import Link from "next/link";
import { ReactNode } from "react";

export interface NavItemProps {
  children: ReactNode;
  href: string;
  onClick: () => void;
}

function NavItem({ children, href, onClick }: NavItemProps) {
  return (
    <Link
      className={
        "py-2 text-[#646466] text-center font-bold relative uppercase tracking-[1px] text-sm" +
        " after:contents-[''] "
      }
      href={href}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export default NavItem;
