import { styled } from "@mui/material";
import { HTMLAttributes, ReactNode } from "react";

type TagType = "success" | "error" | "warning" | "info";
type TagSize = "small" | "medium" | "large";

// TODO: Consider using memoTheme
const TAG_STYLE_MAP: Record<
  TagType,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  success: {
    color: "#67c23a",
    backgroundColor: "#f0f9eb",
    borderColor: "#e1f3d8",
  },
  error: {
    color: "#f56c6c",
    backgroundColor: "#fef0f0",
    borderColor: "#fde2e2",
  },
  warning: {
    color: "#e6a23c",
    backgroundColor: "#fdf6ec",
    borderColor: "#faecd8",
  },
  info: {
    color: "#5b5bfa",
    backgroundColor: "#f4f4f5",
    borderColor: "#e9e9eb",
  },
};

const TAG_SIZE_STYLE_MAP: Record<TagSize, string> = {
  small: "0 5px",
  medium: "0 8px",
  large: "0 10px",
};

const TheTag = styled("span")<Required<Pick<TagProps, "type" | "size">>>`
  border: 1px solid;
  border-radius: 4px;
  display: inline-flex;
  flex-wrap: nowrap;
  font-size: 12px;
  color: ${({ type }) => TAG_STYLE_MAP[type].color};
  background-color: ${({ type }) => TAG_STYLE_MAP[type].backgroundColor};
  border-color: ${({ type }) => TAG_STYLE_MAP[type].borderColor};
  padding: ${({ size = "medium" }) => TAG_SIZE_STYLE_MAP[size]};
`;

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  type?: TagType;
  size?: TagSize;
}

function Tag({
  children,
  type = "info",
  size = "medium",
  ...inProps
}: TagProps) {
  return (
    <TheTag type={type} size={size} {...inProps}>
      {children}
    </TheTag>
  );
}

export default Tag;
