import { ReactNode } from "react";

interface ButtonProps {
  type?: "primary" | "secondary";
  children: ReactNode;
}

function Button({ type, children }: ButtonProps) {
  if (type === "secondary") {
    return (
      <button
        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
        rel="noopener noreferrer"
      >
        {children}
      </button>
    );
  }
  return (
    <a
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

export default Button;
