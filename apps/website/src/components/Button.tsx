import { ReactNode } from "react";

interface ButtonProps {
  type?: "primary" | "secondary";
  children: ReactNode;
}

function Button({ type, children }: ButtonProps) {
  if (type === "secondary") {
    // TODO
  }

  return (
    <button
      className="py-3 bg-[#2b2b2b] font-bold text-white rounded-full w-45"
      rel="noopener noreferrer"
    >
      {children}
    </button>
  );
}

export default Button;
