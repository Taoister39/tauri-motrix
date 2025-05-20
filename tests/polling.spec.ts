import { mockIPC } from "@tauri-apps/api/mocks";

import { usePollingStore } from "@/store/polling";

describe("Polling Store", () => {
  beforeAll(() => {
    mockIPC(() => "OK");
  });
  it("should enable to polling", () => {
    usePollingStore.getState().polling();

    expect(usePollingStore.getState().timer).toBeDefined();
  });

  it("should not timer", () => {
    expect(usePollingStore.getState().timer).toBeUndefined();
  });
});
