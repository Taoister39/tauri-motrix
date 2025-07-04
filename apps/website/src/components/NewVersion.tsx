import Link from "next/link";
import { ReactNode } from "react";

export interface NewVersionProps {
  children?: ReactNode;
  className?: string;
  href: string;
}

function NewVersion({ children, className, href }: NewVersionProps) {
  return (
    <Link className={className} href={href}>
      {children}
      <sup className="text-[#5c5edc] font-bold pl-2">New</sup>
    </Link>
  );
}

export default NewVersion;
