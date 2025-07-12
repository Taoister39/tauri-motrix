import { faSquareUpRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { ReactNode } from "react";

interface OpenLinkProps {
  href: string;
  children: ReactNode;
}

function OpenLink({ href, children }: OpenLinkProps) {
  return (
    <Link href={href} className="inline-flex gap-1 items-center text-[#5c5edc]">
      {children}
      <FontAwesomeIcon icon={faSquareUpRight} />
    </Link>
  );
}

export default OpenLink;
