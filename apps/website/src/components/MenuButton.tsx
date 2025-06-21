export interface MenuButtonProps {
  open?: boolean;
  onClick?: () => void;
}

function MenuButton({ open, onClick }: MenuButtonProps) {
  return (
    <button
      className={
        "border-0 h-6 w-7.5 relative cursor-pointer transition-[rotate_.25s]" +
        " before:scale-x-[.8] before:contents-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-[#5f656f]" +
        " after:scale-x-[.8] after:contents-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#5f656f]" +
        (open
          ? " after:-rotate-45 before:rotate-45 after:top-1/2 before:top-1/2"
          : "")
      }
      onClick={onClick}
    >
      <span
        className={
          "h-0.5 absolute left-0 right-0 bg-[#5f656f] overflow-hidden" +
          (open ? " opacity-0" : "")
        }
      >
        Menu
      </span>
    </button>
  );
}

export default MenuButton;
