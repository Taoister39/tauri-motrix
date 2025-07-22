import clsx from "clsx";
import { CSSProperties } from "react";

interface BaseProps {
  className?: string;
  style?: CSSProperties;
}

export function resolveProps<T extends BaseProps & Record<string, unknown>>(
  defaultProps: T,
  props: T,
  mergeClassNameAndStyle = false,
) {
  const output = { ...props };

  for (const key of Object.keys(defaultProps)) {
    const propName = key as keyof T;

    if (propName === "className" && mergeClassNameAndStyle && props.className) {
      output.className = clsx(defaultProps?.className, props?.className);
    } else if (propName === "style" && mergeClassNameAndStyle && props.style) {
      output.style = {
        ...defaultProps?.style,
        ...props?.style,
      };
    } else if (output[propName] === undefined) {
      output[propName] = defaultProps[propName];
    }
  }

  return output;
}
