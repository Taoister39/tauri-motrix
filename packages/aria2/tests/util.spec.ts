/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  addSecret,
  CallParam,
  createFetcherFactory,
  createSocketResponseFactory,
  defaultOption,
  ensurePrefix,
  JsonRpcRequest,
  MultiCall,
} from "../src/util";

// Mock global fetch
global.fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public readyState: number = 1;
  public url: string;
  public protocol: string;

  private listeners: { [key: string]: ((event: any) => void)[] } = {};

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || "";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = 3;
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  dispatchEvent(event: any) {
    const eventType = event.type;
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach((listener) => listener(event));
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    const event = {
      type: "message",
      data: JSON.stringify(data),
    };
    this.dispatchEvent(event);
  }
}

globalThis.WebSocket = MockWebSocket as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
describe("createFetcherFactory", () => {
  it("should create a fetcher function with correct configuration", () => {
    const url = "http://localhost:6800/jsonrpc";
    const timeout = 5000;
    const fetcher = createFetcherFactory(url, timeout);

    expect(typeof fetcher).toBe("function");
  });

  it("should make successful HTTP request", async () => {
    const mockResponse = { result: "success" };
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const fetcher = createFetcherFactory("http://localhost:6800/jsonrpc", 5000);
    const data = { method: "aria2.getVersion" };

    const result = await fetcher(data);

    expect(fetch).toHaveBeenCalledWith("http://localhost:6800/jsonrpc", {
      method: "POST",
      body: JSON.stringify(data),
    });
    expect(result).toBe("success");
  });

  it("should reject when response contains error", async () => {
    const mockError = { code: -1, message: "Test error" };
    const mockResponse = { error: mockError };
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const fetcher = createFetcherFactory("http://localhost:6800/jsonrpc", 5000);
    const data = { method: "aria2.getVersion" };

    await expect(fetcher(data)).rejects.toEqual(mockError);
  });

  it("should timeout after specified duration", async () => {
    const fetcher = createFetcherFactory("http://localhost:6800/jsonrpc", 1000);
    const data = { method: "aria2.getVersion" };

    // Mock a delayed response
    (global.fetch as any).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                json: () => Promise.resolve({ result: "delayed" }),
              }),
            2000,
          );
        }),
    );

    const promise = fetcher(data);

    // Advance timer to trigger timeout
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow("Request timeout");
  });

  it("should handle fetch errors", async () => {
    const fetchError = new Error("Network error");
    (global.fetch as any).mockRejectedValueOnce(fetchError);

    const fetcher = createFetcherFactory("http://localhost:6800/jsonrpc", 5000);
    const data = { method: "aria2.getVersion" };

    await expect(fetcher(data)).rejects.toThrow("Network error");
  });
});

describe("createSocketResponseFactory", () => {
  let mockSocket: MockWebSocket;
  let message: JsonRpcRequest;

  beforeEach(() => {
    mockSocket = new MockWebSocket("ws://localhost:6800/jsonrpc");
    message = {
      jsonrpc: "2.0",
      id: "test-id",
      method: "aria2.getVersion",
      params: [],
    };
  });

  it("should resolve with result when response matches request id", async () => {
    const promise = createSocketResponseFactory(mockSocket as any, message);

    // Simulate successful response
    setTimeout(() => {
      mockSocket.simulateMessage({
        jsonrpc: "2.0",
        id: "test-id",
        result: "success",
      });
    }, 100);

    jest.advanceTimersByTime(100);
    const result = await promise;
    expect(result).toBe("success");
  });

  it("should reject when response contains error", async () => {
    const promise = createSocketResponseFactory(mockSocket as any, message);

    // Simulate error response
    setTimeout(() => {
      mockSocket.simulateMessage({
        jsonrpc: "2.0",
        id: "test-id",
        error: { code: -1, message: "Test error" },
      });
    }, 100);

    jest.advanceTimersByTime(100);
    await expect(promise).rejects.toEqual({
      code: -1,
      message: "Test error",
    });
  });

  it("should ignore messages with different id", async () => {
    const promise = createSocketResponseFactory(mockSocket as any, message);

    // Simulate message with different id
    setTimeout(() => {
      mockSocket.simulateMessage({
        jsonrpc: "2.0",
        id: "different-id",
        result: "wrong",
      });
    }, 100);

    // Simulate correct message
    setTimeout(() => {
      mockSocket.simulateMessage({
        jsonrpc: "2.0",
        id: "test-id",
        result: "correct",
      });
    }, 200);

    jest.advanceTimersByTime(200);
    const result = await promise;
    expect(result).toBe("correct");
  });

  it("should ignore notification messages (messages with method)", async () => {
    const promise = createSocketResponseFactory(mockSocket as any, message);

    // Simulate notification message
    setTimeout(() => {
      mockSocket.simulateMessage({
        jsonrpc: "2.0",
        method: "aria2.onDownloadComplete",
        params: ["gid123"],
      });
    }, 100);

    // Simulate correct response
    setTimeout(() => {
      mockSocket.simulateMessage({
        jsonrpc: "2.0",
        id: "test-id",
        result: "success",
      });
    }, 200);

    jest.advanceTimersByTime(200);
    const result = await promise;
    expect(result).toBe("success");
  });

  it("should send message to websocket", () => {
    const sendSpy = jest.spyOn(mockSocket, "send");
    createSocketResponseFactory(mockSocket as any, message);

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
  });
});

describe("ensurePrefix", () => {
  it("should add aria2 prefix to method without prefix", () => {
    expect(ensurePrefix("getVersion")).toBe("aria2.getVersion");
    expect(ensurePrefix("addUri")).toBe("aria2.addUri");
  });

  it("should not add prefix if aria2 prefix already exists", () => {
    expect(ensurePrefix("aria2.getVersion")).toBe("aria2.getVersion");
    expect(ensurePrefix("aria2.addUri")).toBe("aria2.addUri");
  });

  it("should not add prefix if system prefix exists", () => {
    expect(ensurePrefix("system.multicall")).toBe("system.multicall");
    expect(ensurePrefix("system.listMethods")).toBe("system.listMethods");
  });

  it("should handle empty string", () => {
    expect(ensurePrefix("")).toBe("aria2.");
  });
});

describe("addSecret", () => {
  it("should add secret token to beginning of params array", () => {
    const data = ["param1", "param2"];
    const secret = "my-secret";
    const result = addSecret(data, secret);

    expect(result).toEqual(["token:my-secret", "param1", "param2"]);
  });

  it("should convert non-array data to array with secret", () => {
    const data = "single-param";
    const secret = "my-secret";
    const result = addSecret(data, secret);

    expect(result).toEqual(["token:my-secret", "single-param"]);
  });

  it("should handle object data", () => {
    const data = { key: "value" };
    const secret = "my-secret";
    const result = addSecret(data, secret);

    expect(result).toEqual(["token:my-secret", { key: "value" }]);
  });

  it("should return array without token when no secret provided", () => {
    const data = ["param1", "param2"];
    const result = addSecret(data);

    expect(result).toEqual(["param1", "param2"]);
  });

  it("should handle non-array data without secret", () => {
    const data = "single-param";
    const result = addSecret(data);

    expect(result).toEqual(["single-param"]);
  });

  it("should handle undefined secret", () => {
    const data = ["param1"];
    const result = addSecret(data, undefined);

    expect(result).toEqual(["param1"]);
  });

  it("should handle empty string secret", () => {
    const data = ["param1"];
    const result = addSecret(data, "");

    expect(result).toEqual(["param1"]);
  });
});

describe("defaultOption", () => {
  it("should have correct default values", () => {
    expect(defaultOption.server).toBe("127.0.0.1:6800");
    expect(defaultOption.timeout).toBe(15000);
  });
});

describe("Type definitions", () => {
  it("should accept valid CallParam types", () => {
    const stringParam: CallParam = "test";
    const booleanParam: CallParam = true;
    const numberParam: CallParam = 123;
    const objectParam: CallParam = { key: "value" };
    const arrayParam: CallParam = ["nested", "array"];

    // These should compile without errors
    expect(typeof stringParam).toBe("string");
    expect(typeof booleanParam).toBe("boolean");
    expect(typeof numberParam).toBe("number");
    expect(typeof objectParam).toBe("object");
    expect(Array.isArray(arrayParam)).toBe(true);
  });

  it("should accept valid MultiCall format", () => {
    const multiCall: MultiCall = [
      { method: "aria2.getVersion", params: [] },
      { method: "aria2.getGlobalStat", params: {} },
      { method: "aria2.addUri", params: ["http://example.com"] },
    ];

    expect(Array.isArray(multiCall)).toBe(true);
    expect(multiCall).toHaveLength(3);
  });

  it("should accept valid JsonRpcRequest format", () => {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: "test-id",
      method: "aria2.getVersion",
      params: [],
    };

    expect(request.jsonrpc).toBe("2.0");
    expect(request.id).toBe("test-id");
    expect(request.method).toBe("aria2.getVersion");
    expect(Array.isArray(request.params)).toBe(true);
  });
});
