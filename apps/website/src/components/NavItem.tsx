import Link from "next/link";
import { ReactNode } from "react";

export interface NavItemProps {
  children: ReactNode;
  href: string;
}

function NavItem({ children, href }: NavItemProps) {
  return (
    <Link className="py-2" href={href}>
      {children}
    </Link>
  );
}

export default NavItem;
