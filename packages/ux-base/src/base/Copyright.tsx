export interface CopyrightProps {
  component?: React.ElementType;
}

function BaseCopyright({ component }: CopyrightProps) {
  const BaseComponent = component || "span";

  return <BaseComponent>©2026 Tauri Motrix</BaseComponent>;
}

export default BaseCopyright;
