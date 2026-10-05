import { act, renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { SWRConfig } from "swr";

import { useAria2Info } from "@/hooks/aria2";
import { getAria2 } from "@/services/aria2c_api";
import { getAria2Info, patchAria2Rpc } from "@/services/cmd";

jest.mock("@/services/aria2c_api");
jest.mock("@/services/cmd");

const original = { port: 16801, server: "127.0.0.1:16801", secret: "" };
const updated = { port: 6800, server: "127.0.0.1:6800", secret: "new-secret" };

function wrapper({ children }: PropsWithChildren) {
  return (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getAria2Info).mockResolvedValue(original);
  jest
    .mocked(getAria2)
    .mockResolvedValue({} as Awaited<ReturnType<typeof getAria2>>);
});

it("updates displayed RPC settings after saving and reconnecting", async () => {
  jest.mocked(patchAria2Rpc).mockResolvedValue(updated);
  const { result } = renderHook(useAria2Info, { wrapper });
  await waitFor(() => expect(result.current.aria2Info).toEqual(original));
  await act(async () => {
    await result.current.patchInfo({ port: 6800, secret: "new-secret" });
  });
  expect(patchAria2Rpc).toHaveBeenCalledWith({
    port: 6800,
    secret: "new-secret",
  });
  expect(result.current.aria2Info).toEqual(updated);
  expect(getAria2).toHaveBeenCalledWith(true);
});

it("keeps the original RPC settings and reports a failed save", async () => {
  jest.mocked(patchAria2Rpc).mockRejectedValue(new Error("port unavailable"));
  const { result } = renderHook(useAria2Info, { wrapper });
  await waitFor(() => expect(result.current.aria2Info).toEqual(original));
  await act(async () => {
    await expect(result.current.patchInfo(updated)).rejects.toThrow(
      "port unavailable",
    );
  });
  expect(result.current.aria2Info).toEqual(original);
});
