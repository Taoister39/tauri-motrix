import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
}

function ElegantDarkButton({ children }: ButtonProps) {
  return (
    <button
      className="py-3 bg-[#2b2b2b] font-bold text-white rounded-full w-45"
      rel="noopener noreferrer"
    >
      {children}
    </button>
  );
}

export default ElegantDarkButton;
