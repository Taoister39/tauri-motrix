"use client";
import { createContext, ReactNode, useContext, useState } from "react";

export interface StackPageContextType {
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const StackPageContext = createContext<StackPageContextType>({
  open: false,
  setOpen() {
    console.warn("StackPageContextWrapper.setOpen is not implemented");
  },
});

export function useStackPageOpen() {
  const { open, setOpen } = useContext(StackPageContext);

  return {
    open,
    setOpen,
    setFalse: () => setOpen(false),
    setTrue: () => setOpen(true),
    toggle: () => setOpen((prev) => !prev),
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
