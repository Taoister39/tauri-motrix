import { invoke } from "@tauri-apps/api/core";
import { mockIPC } from "@tauri-apps/api/mocks";
import { clearMocks, mockRPC } from "@tauri-motrix/aria2/mocks";

import {
  downloadingTasksApi,
  getAria2,
  saveSessionApi,
} from "@/services/aria2c_api";

beforeAll(() => {
  mockIPC((cmd) => {
    if (cmd === "get_aria2_info") {
      return {
        port: 16801,
        server: "http://127.0.0.1:16801",
      };
    }
  });
});

describe("getAria2 fn", () => {
  it("should invoke get_aria2_info", () => {
    // getAria2();
    const expectObj = {
      port: 16801,
      server: "http://127.0.0.1:16801",
    };
    expect(invoke("get_aria2_info")).resolves.toEqual(expectObj);
  });

  it("should call getAria2", async () => {
    // @ts-expect-error jest runtime
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({}),
      }),
    );
    const instance = await getAria2();

    expect(instance).toBeDefined();
  });

  it("should call aria2 version", async () => {
    const getVersionData = {
      enabledFeatures: [
        "Async DNS",
        "BitTorrent",
        "Firefox3 Cookie",
        "GZip",
        "HTTPS",
        "Message Digest",
        "Metalink",
        "XML-RPC",
        "SFTP",
      ],
      version: "1.37.0",
    };

    // @ts-expect-error get aria2 version
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ result: getVersionData }),
      }),
    );

    const { call } = await getAria2();

    expect(call("aria2.getVersion")).resolves.toEqual(getVersionData);
  });
});

describe("Aria2 api", () => {
  beforeEach(() => {
    mockRPC((method) => {
      switch (method) {
        case "aria2.custom":
          return "OK";
        case "system.listNotifications":
          return ["aria2.custom"];
        case "aria2.tellActive":
          return "tellActive is OK";
        case "aria2.tellWaiting":
          return "tellWaiting is OK";
      }
    });
  });

  afterEach(() => {
    clearMocks();
  });
  it("should enable to mock", async () => {
    const { call } = await getAria2();

    expect(call("custom")).resolves.toEqual("OK");
  });

  it("should get listNotifications", async () => {
    const { listNotifications } = await getAria2();

    expect(listNotifications()).resolves.toEqual(["aria2.custom"]);
  });

  it("should get tasks", async () => {
    expect(downloadingTasksApi()).resolves.toEqual([
      ["tellActive is OK"],
      ["tellWaiting is OK"],
    ]);
  });

  it("should undefined for not mock", async () => {
    expect(saveSessionApi()).resolves.toBeUndefined();
  });
});
