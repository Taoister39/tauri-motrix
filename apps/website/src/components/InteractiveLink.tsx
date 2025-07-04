"use client";

import { ReactNode } from "react";

interface InteractiveLinkProps {
  href: string;
  onOpen?: (url: string) => void;
  children: ReactNode;
  className?: string;
}

export default function InteractiveLink({
  href,
  onOpen,
  children,
  className,
}: InteractiveLinkProps) {
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        if (onOpen) {
          e.preventDefault();
          onOpen(href);
        }
      }}
    >
      {children}
    </a>
  );
}
