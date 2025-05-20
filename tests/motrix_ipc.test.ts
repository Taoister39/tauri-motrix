import { mockIPC } from "@tauri-apps/api/mocks";

import { exitApp, patchMotrixConfig } from "@/services/cmd";

beforeAll(() => {
  mockIPC((cmd) => {
    switch (cmd) {
      case "exit_app":
        return "OK";
      case "patch_motrix_config":
        return null;
    }
  });
});

describe("motrix base command", () => {
  it("should return OK for call exit", () => {
    expect(exitApp()).resolves.toEqual("OK");
  });

  it("should enable to patchMotrixConfig", () => {
    expect(patchMotrixConfig({})).resolves.toBeNull();
  });
});
