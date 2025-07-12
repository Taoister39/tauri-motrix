export interface CopyrightProps {
  component?: React.ElementType;
}

function BaseCopyright({ component }: CopyrightProps) {
  const BaseComponent = component || "span";

  return <BaseComponent>&copy;2025 Tauri Motrix</BaseComponent>;
}

export default BaseCopyright;
