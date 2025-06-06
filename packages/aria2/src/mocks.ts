import { CallParam, JsonRpcRequest } from "./util";

let originalFetch: typeof globalThis.fetch | null;

export function mockRPC(
  cb: (method: string, payload: unknown) => unknown,
  jsonRpcUrl?: string,
) {
  originalFetch = globalThis.fetch;
  // @ts-expect-error only mock on unit test
  globalThis.fetch = (url, option: { body: string }) => {
    if (jsonRpcUrl && url.toString() !== jsonRpcUrl) {
      return originalFetch?.(url, option);
    }

    const data: JsonRpcRequest = JSON.parse(option.body);

    let result;
    if (data.method === "system.multicall") {
      const results = (
        data.params[0] as Array<{ methodName: string; params: CallParam }>
      ).map(({ methodName, params }) => [cb(methodName, params)]);
      result = results;
    } else {
      result = cb(data.method, data.params);
    }

    return Promise.resolve({
      json: () => Promise.resolve({ result }),
    });
  };
}

export function clearMocks() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
}
