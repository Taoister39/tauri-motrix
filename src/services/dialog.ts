import { createStore } from "zustand/vanilla";

export interface DialogAction<T extends string = string> {
  id: T;
  label: string;
  checkedLabel?: string;
  danger?: boolean;
}

export interface DialogOptions<T extends string = string> {
  title: string;
  message: string;
  details?: string[];
  actions: DialogAction<T>[];
  cancelLabel: string;
  checkboxLabel?: string;
}

export interface DialogResult<T extends string = string> {
  action: T | null;
  checked: boolean;
}

interface DialogRequest {
  id: number;
  options: DialogOptions;
  complete: (result: DialogResult) => void;
}

export const dialogStore = createStore<{ requests: DialogRequest[] }>(() => ({
  requests: [],
}));

let nextId = 0;
let hosts = 0;

export function showDialog<T extends string>(
  options: DialogOptions<T>,
): Promise<DialogResult<T>> {
  if (!hosts) return Promise.resolve({ action: null, checked: false });
  return new Promise((resolve) => {
    const request: DialogRequest = {
      id: ++nextId,
      options,
      complete: (result) =>
        resolve({
          action:
            options.actions.find(({ id }) => id === result.action)?.id ?? null,
          checked: result.checked,
        }),
    };
    dialogStore.setState(({ requests }) => ({
      requests: [...requests, request],
    }));
  });
}

export function completeDialog(id: number, result: DialogResult) {
  const { requests } = dialogStore.getState();
  if (requests[0]?.id !== id) return;
  dialogStore.setState({ requests: requests.slice(1) });
  requests[0].complete(result);
}

export function registerDialogHost() {
  hosts++;
  return () => {
    if (--hosts) return;
    const { requests } = dialogStore.getState();
    dialogStore.setState({ requests: [] });
    requests.forEach(({ complete }) =>
      complete({ action: null, checked: false }),
    );
  };
}
