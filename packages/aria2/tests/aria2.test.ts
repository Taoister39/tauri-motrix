import type { Aria2InstanceConfig } from "../src/aria2";
import { Aria2 } from "../src/aria2";
import { create } from "../src/index";
import { clearMocks, mockRPC } from "../src/mocks";
import { defaultOption, ensurePrefix } from "../src/util";

describe("Aria2 Class", () => {
  let aria2: Aria2;
  let config: Aria2InstanceConfig;

  beforeEach(() => {
    config = {
      server: "localhost:6800",
      timeout: 1000,
      isHttps: false,
      isWss: false,
    };
    aria2 = new Aria2(config);
  });

  afterEach(() => {
    aria2.close();
    clearMocks();
  });

  it("should create an Aria2 instance", () => {
    expect(aria2).toBeInstanceOf(Aria2);
  });

  it("should open and close the WebSocket connection", () => {
    const mockWebSocket = {
      readyState: WebSocket.CLOSED,
      open: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    aria2.open.call({
      ...aria2,
      webSocketIns: mockWebSocket,
    });
    aria2.close.call({
      ...aria2,
      webSocketIns: mockWebSocket,
    });
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  describe("call", () => {
    // ! now unsupported by mock websocket
    it.skip("should call the Aria2 method via WebSocket when open", async () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const method = "aria2.getVersion";
      const result = { version: "1.36.0" };

      mockRPC((m) => {
        if (m === method) {
          return result;
        }
      });

      const promise = aria2.call.call(
        { ...aria2, webSocketIns: mockWebSocket },
        method,
      );

      const res = await promise;
      expect(res).toEqual(result);
    });

    it("should call the Aria2 method via fetch when WebSocket is not open", async () => {
      const method = "aria2.getVersion";
      const result = { version: "1.36.0" };

      mockRPC((m) => {
        if (m === method) {
          return result;
        }
      });

      const res = await aria2.call(method);
      expect(res).toEqual(result);
    });

    it("should handle timeout errors when WebSocket is open", () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const method = "aria2.getVersion";

      expect(
        aria2.call.call({ ...aria2, webSocketIns: mockWebSocket }, method),
      ).rejects.toThrow("Request timed out.");
    });

    it("should add secret to params", async () => {
      const method = "aria2.addUri";
      const secret = "test-secret";
      aria2.instanceConfig.secret = secret;

      mockRPC((m, params) => {
        if (m === method) {
          expect(params).toEqual(["token:" + secret, ["http://example.com"]]);
          return "gid";
        }
      });

      await aria2.call(method, ["http://example.com"]);
    });
  });

  describe("multiCall", () => {
    it("multiCall should call system.multicall with correct parameters", async () => {
      const calls = [
        { method: "aria2.getVersion", params: [] },
        { method: "aria2.getGlobalStat", params: [] },
      ];

      mockRPC((m, params) => {
        if (m === "aria2.getVersion") {
          expect(m).toBe(ensurePrefix(m));
          expect(params).toEqual([]);
          return "version";
        }

        if (m === "aria2.getGlobalStat") {
          expect(m).toBe(ensurePrefix(m));
          expect(params).toEqual([]);
          return "stat";
        }
      });

      const res = await aria2.multiCall(calls);
      expect(res).toEqual([["version"], ["stat"]]);
    });
  });

  describe("event listeners", () => {
    it("should add and dispatch event listeners", () => {
      const mockCallback = jest.fn();
      aria2.addListener("downloadStart", mockCallback);
      aria2.dispatchEvent("aria2.downloadStart", { gid: "123" });
      expect(mockCallback).toHaveBeenCalledWith({ gid: "123" });
    });

    it("should set event listener, replacing existing ones", () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      aria2.addListener("downloadStart", mockCallback1);
      aria2.setListener("downloadStart", mockCallback2);
      aria2.dispatchEvent("aria2.downloadStart", { gid: "123" });

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledWith({ gid: "123" });
    });

    it("should remove event listeners", () => {
      const mockCallback = jest.fn();
      aria2.addListener("downloadStart", mockCallback);
      aria2.removeListener("downloadStart", mockCallback);
      aria2.dispatchEvent("aria2.downloadStart", { gid: "123" });
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should remove all event listeners for a method", () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      aria2.addListener("downloadStart", mockCallback1);
      aria2.addListener("downloadStart", mockCallback2);

      aria2.removeAllListener("downloadStart");
      aria2.dispatchEvent("aria2.downloadStart", { gid: "123" });
      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).not.toHaveBeenCalled();
    });
  });

  describe("offline queue", () => {
    it("should dispatch offline events when listener is added", () => {
      const mockCallback = jest.fn();
      aria2.dispatchEvent("downloadStart", { gid: "123" });
      aria2.addListener("downloadStart", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith({ gid: "123" });
    });

    it("should not dispatch offline events if already dispatched", () => {
      const mockCallback = jest.fn();
      aria2.dispatchEvent("downloadStart", { gid: "123" });
      aria2.addListener("downloadStart", mockCallback);
      mockCallback.mockClear(); // reset call count
      aria2.addListener("downloadStart", mockCallback);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should dispatch offline events when setListener is used", () => {
      const mockCallback = jest.fn();
      aria2.dispatchEvent("downloadStart", { gid: "123" });
      aria2.setListener("downloadStart", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith({ gid: "123" });
    });
  });

  describe("list methods and notifications", () => {
    it("should call system.listNotifications", async () => {
      const method = "system.listNotifications";
      const result = ["aria2.onDownloadStart"];

      mockRPC((m) => {
        if (m === method) {
          return result;
        }
      });

      const res = await aria2.listNotifications();
      expect(res).toEqual(result);
    });

    it("should call system.listMethods", async () => {
      const method = "system.listMethods";
      const result = ["aria2.addUri"];

      mockRPC((m) => {
        if (m === method) {
          return result;
        }
      });

      const res = await aria2.listMethods();
      expect(res).toEqual(result);
    });
  });
});

describe("default export aria2", () => {
  it("should create an aria2 instance with default options", () => {
    const aria2Instance = create();
    expect(aria2Instance.instanceConfig).toEqual(defaultOption);
  });

  it("should allow overriding default config", () => {
    const newConfig = {
      server: "192.168.1.1:6800",
      timeout: 5000,
    };
    const aria2Instance = create(newConfig);
    expect(aria2Instance.instanceConfig).toEqual({
      ...defaultOption,
      ...newConfig,
    });
  });
});

describe("mockRPC", () => {
  it("should mock the fetch function", async () => {
    const mockCallback = jest.fn(() => ({}));
    mockRPC(mockCallback);

    const response = await fetch("http://example.com", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await response.json();

    expect(mockCallback).toHaveBeenCalled();
    clearMocks();
  });

  it("should clear the mocks", async () => {
    const mockCallback = jest.fn(() => ({}));
    mockRPC(mockCallback);

    clearMocks();

    try {
      await fetch("http://example.com", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
    }
  });

  it("should mock the fetch function with jsonRpcUrl", async () => {
    const mockCallback = jest.fn(() => ({}));
    const jsonRpcUrl = "http://test.com/jsonrpc";
    mockRPC(mockCallback, jsonRpcUrl);

    await fetch("http://test.com/jsonrpc", {
      method: "POST",
      body: JSON.stringify({}),
    });

    expect(mockCallback).toHaveBeenCalled();
    clearMocks();
  });

  it("should not mock the fetch function if url is different with jsonRpcUrl", async () => {
    const mockCallback = jest.fn(() => ({}));
    const jsonRpcUrl = "http://test.com/jsonrpc";
    mockRPC(mockCallback, jsonRpcUrl);

    try {
      await fetch("http://example.com", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
    }

    expect(mockCallback).not.toHaveBeenCalled();
    clearMocks();
  });
});
