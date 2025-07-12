"use client";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";

export interface StackPageContextType {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export const StackPageContext = createContext<StackPageContextType>({
  open: false,
  setOpen() {
    console.warn("StackPageContextWrapper.setOpen is not implemented");
  },
});

export function useStackPageOpen() {
  const { open, setOpen } = useContext(StackPageContext);

  const setFalse = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const setTrue = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, [setOpen]);

  return {
    open,
    setOpen,
    setFalse,
    setTrue,
    toggle,
  };
}

function StackPageProviderWrapper(props: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <StackPageContext.Provider value={{ open, setOpen }}>
      {props.children}
    </StackPageContext.Provider>
  );
}

export default StackPageProviderWrapper;
