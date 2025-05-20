import { mockRPC } from "@root/packages/aria2/src/mocks";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { TASK_STATUS_ENUM } from "@/constant/task";
import { useTaskStore } from "@/store/task";

describe("Task Store", () => {
  beforeAll(() => {
    mockRPC(() => "OK");
    mockIPC((cmd) => {
      if (cmd === "get_aria2_info") {
        return {
          port: 16801,
          server: "http://127.0.0.1:16801",
        };
      }
    });
  });

  afterAll(() => {
    clearMocks();
  });
  it("should ensure correct default value", () => {
    expect(useTaskStore.getState().fetchType).toBe(TASK_STATUS_ENUM.Active);
  });

  it("should enable to fetch list", async () => {
    await useTaskStore.getState().fetchTasks();
    expect(useTaskStore.getState().tasks).toEqual(["OK", "OK"]);
  });
});
