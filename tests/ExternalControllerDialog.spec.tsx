import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef } from "react";

import ExternalControllerDialog from "@/business/setting/ExternalControllerDialog";
import { DialogRef } from "@/components/BaseDialog";
import { Notice } from "@/components/Notice";
import { useAria2Info } from "@/hooks/aria2";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/hooks/aria2");
jest.mock("@/components/Notice", () => ({
  Notice: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: jest.fn(),
}));

const patchInfo = jest.fn();

function openDialog() {
  const ref = createRef<DialogRef>();
  render(<ExternalControllerDialog ref={ref} />);
  act(() => ref.current?.open());
  return ref;
}

beforeEach(() => {
  jest.clearAllMocks();
  patchInfo.mockResolvedValue(undefined);
  jest.mocked(useAria2Info).mockReturnValue({
    aria2Info: { port: 16801, server: "127.0.0.1:16801", secret: "old-secret" },
    patchInfo,
    mutateInfo: jest.fn(),
  });
});

it("saves the port and secret and closes only after saving succeeds", async () => {
  let finish!: () => void;
  patchInfo.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  openDialog();
  fireEvent.change(screen.getByLabelText("setting.RpcPort"), {
    target: { value: "6800" },
  });
  fireEvent.change(screen.getByLabelText("setting.RpcSecret"), {
    target: { value: "new=secret" },
  });
  fireEvent.click(screen.getByText("common.Save"));
  await waitFor(() =>
    expect(patchInfo).toHaveBeenCalledWith({
      port: 6800,
      secret: "new=secret",
    }),
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("setting.RpcPort")).toBeDisabled();
  await act(async () => finish());
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it.each(["", "0", "1023", "65536", "6800.5"])(
  "rejects an invalid port (%s)",
  async (port) => {
    openDialog();
    fireEvent.change(screen.getByLabelText("setting.RpcPort"), {
      target: { value: port },
    });
    fireEvent.click(screen.getByText("common.Save"));
    expect(
      await screen.findByText("setting.RpcPortInvalid"),
    ).toBeInTheDocument();
    expect(patchInfo).not.toHaveBeenCalled();
  },
);

it("keeps edits available after a save failure", async () => {
  patchInfo.mockRejectedValue("RPC port 6800 is unavailable");
  openDialog();
  fireEvent.change(screen.getByLabelText("setting.RpcPort"), {
    target: { value: "6800" },
  });
  fireEvent.change(screen.getByLabelText("setting.RpcSecret"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByText("common.Save"));
  await waitFor(() =>
    expect(Notice.error).toHaveBeenCalledWith(
      "RPC port 6800 is unavailable",
      4000,
    ),
  );
  expect(patchInfo).toHaveBeenCalledWith({ port: 6800, secret: "" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("setting.RpcPort")).toHaveValue(6800);
});

it("discards unsaved edits when reopened and copies the active endpoint", async () => {
  jest.mocked(writeText).mockResolvedValue();
  const ref = openDialog();
  fireEvent.change(screen.getByLabelText("setting.RpcPort"), {
    target: { value: "6800" },
  });
  fireEvent.click(screen.getByText("common.Cancel"));
  act(() => ref.current?.open());
  expect(screen.getByLabelText("setting.RpcPort")).toHaveValue(16801);
  fireEvent.click(screen.getByLabelText("setting.CopyRpcAddress"));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith("http://127.0.0.1:16801/jsonrpc"),
  );
});
