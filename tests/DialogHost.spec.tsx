import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { DialogHost } from "@/components/DialogHost";
import {
  type DialogOptions,
  type DialogResult,
  showDialog,
} from "@/services/dialog";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const options: DialogOptions<"remove"> = {
  title: "Remove download",
  message: "Choose whether to keep the files.",
  checkboxLabel: "Also delete downloaded files",
  cancelLabel: "Cancel",
  actions: [
    {
      id: "remove",
      label: "Remove task",
      checkedLabel: "Remove and delete files",
      danger: true,
    },
  ],
};

async function openDialog(overrides: Partial<typeof options> = {}) {
  let pending!: Promise<DialogResult<"remove">>;
  await act(async () => {
    pending = showDialog({ ...options, ...overrides });
  });
  return { result: pending };
}

describe("DialogHost", () => {
  it("defaults to keeping files and focuses the cancel action", async () => {
    render(<DialogHost />);
    const { result: pending } = await openDialog();
    expect(
      screen.getByRole("dialog", { name: options.title }),
    ).toHaveAccessibleDescription(options.message);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove and delete files" }),
    );
    await expect(pending).resolves.toEqual({ action: "remove", checked: true });
    const { result: next } = await openDialog();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await expect(next).resolves.toEqual({ action: null, checked: false });
  });

  it("serializes requests and treats Escape as cancellation", async () => {
    render(<DialogHost />);
    const { result: first } = await openDialog();
    const { result: second } = await openDialog({ title: "Second request" });
    expect(
      screen.queryByRole("dialog", { name: "Second request" }),
    ).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    await expect(first).resolves.toEqual({ action: null, checked: false });
    expect(
      screen.getByRole("dialog", { name: "Second request" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await expect(second).resolves.toEqual({ action: null, checked: false });
  });

  it("cancels active and queued requests when the host unmounts", async () => {
    const { unmount } = render(<DialogHost />);
    const { result: first } = await openDialog();
    const { result: second } = await openDialog();
    unmount();
    await expect(first).resolves.toEqual({ action: null, checked: false });
    await expect(second).resolves.toEqual({ action: null, checked: false });
    await expect(showDialog(options)).resolves.toEqual({
      action: null,
      checked: false,
    });
  });

  it("treats a backdrop click as cancellation", async () => {
    render(<DialogHost />);
    const { result: pending } = await openDialog();
    const backdrop = screen.getByRole("dialog").parentElement!;
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    await expect(pending).resolves.toEqual({ action: null, checked: false });
  });

  it("restores focus to the trigger after cancellation", async () => {
    render(
      <>
        <button
          onClick={() => {
            void showDialog(options);
          }}
        >
          Open
        </button>
        <DialogHost />
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    await act(async () => {
      fireEvent.click(trigger);
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
