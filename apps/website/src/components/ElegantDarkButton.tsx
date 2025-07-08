import clsx from "clsx";
import { ReactNode } from "react";

interface ButtonProps {
  className?: string;
  children: ReactNode;
}

function ElegantDarkButton({ children, className }: ButtonProps) {
  return (
    <button
      className={clsx(
        "py-3 bg-[#2b2b2b] font-bold text-white rounded-full w-45",
        className,
      )}
      rel="noopener noreferrer"
    >
      {children}
    </button>
  );
}

export default ElegantDarkButton;
