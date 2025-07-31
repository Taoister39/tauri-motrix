import Link from "next/link";
import { ReactNode } from "react";

export interface NavItemProps {
  children: ReactNode;
  href: string;
  setFalse: () => void;
}

function NavItem({ children, href, setFalse }: NavItemProps) {
  return (
    <Link
      className={
        "py-2 text-[#646466] font-bold relative uppercase tracking-[1px] text-sm" +
        " after:contents-[''] "
      }
      href={href}
      onNavigate={setFalse}
    >
      {children}
    </Link>
  );
}

export default NavItem;
