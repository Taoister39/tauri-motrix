import { sleep } from "../src/utils/waiter";

describe("Waiter Utils", () => {
  it("should sleep for the specified time", async () => {
    const start = Date.now();
    await sleep(1000); // Wait for 1 second
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(1000); // Check if it waited at least 1 second
  });
});
