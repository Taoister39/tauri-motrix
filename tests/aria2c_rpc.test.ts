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
        server: "127.0.0.1:16801",
        secret: "test-secret",
      };
    }
  });
});

describe("getAria2 fn", () => {
  it("should invoke get_aria2_info", () => {
    // getAria2();
    const expectObj = {
      port: 16801,
      server: "127.0.0.1:16801",
      secret: "test-secret",
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
    expect(instance.instanceConfig.secret).toBe("test-secret");
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

it("reconnects with updated settings and preserves download notifications", async () => {
  const socket = { onmessage: null, close: jest.fn() } as unknown as WebSocket;
  const websocket = jest
    .spyOn(globalThis, "WebSocket")
    .mockImplementation(() => socket);
  try {
    const previous = await getAria2();
    const notification = jest.fn();
    previous.addListener("onDownloadComplete", notification);
    mockIPC((command) =>
      command === "get_aria2_info"
        ? {
            port: 6800,
            server: "127.0.0.1:6800",
            secret: "updated-secret",
          }
        : undefined,
    );
    const updated = await getAria2(true);
    expect(updated.instanceConfig).toMatchObject({
      server: "127.0.0.1:6800",
      secret: "updated-secret",
    });
    socket.onmessage?.({
      data: JSON.stringify({
        method: "aria2.onDownloadComplete",
        params: [{ gid: "task" }],
      }),
    } as MessageEvent);
    expect(notification).toHaveBeenCalledWith([{ gid: "task" }]);
    updated.close();
  } finally {
    websocket.mockRestore();
  }
});
