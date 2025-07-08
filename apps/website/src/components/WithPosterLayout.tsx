import clsx from "clsx";
import Image from "next/image";
import { ReactNode } from "react";

export interface WithPosterLayoutProps {
  children: ReactNode;
  className?: string;
}

function WithPosterLayout({ children, className }: WithPosterLayoutProps) {
  return (
    <div
      className={clsx(
        "min-h-full flex items-center flex-wrap px-[8vw] gap-4 py-10",
        className,
      )}
    >
      <article>{children}</article>
      <figure
        className={clsx(
          "lg:absolute lg:left-[60vw] lg:bottom-[6vh] lg:h-full w-full max-h-[80vh] ",
          "lg:hover:translate-x-[-18vw] transition-all duration-800 delay-100 ease-[cubic-bezier(.08,.82,.17,1)]",
          // "lg:after:shadow-[0_0_20px_0_rgba(0,0,0,0.075),0_25px_30px_0_rgba(0,0,0,0.175)] after:content-['']",
          // "after:h-full after:w-full after:left-0 after:top-0 after:absolute",
        )}
      >
        <Image
          src="/screenshot-task-list-downloading-en.png"
          width={898}
          height={752}
          alt="Screenshot"
          priority
          unoptimized
          className="w-auto h-auto max-w-full max-h-full"
        />
      </figure>
    </div>
  );
}

export default WithPosterLayout;
