export type CallParam = string | boolean | number | object | CallParam[];

export type MultiCall = Array<{
  method: string;
  params: CallParam;
}>;

export const createFetcherFactory =
  (url: string, timeout: number) =>
  <T>(data: object) =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Request timeout"));
      }, timeout);

      fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.error) {
            return Promise.reject(res.error);
          }
          resolve(res.result as T);
        })
        .catch((err) => reject(err))
        .finally(() => clearTimeout(timer));
    });

export type JsonRpcRequest = {
  jsonrpc: string;
  id: string;
  method: string;
  params: CallParam[];
};
export const createSocketResponseFactory = <T>(
  webSocketIns: WebSocket,
  message: JsonRpcRequest,
) =>
  new Promise<T>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (!data?.method && data.id === message.id) {
        webSocketIns.removeEventListener("message", onMessage);

        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
      }
    };
    webSocketIns.addEventListener("message", onMessage);
    webSocketIns.send(JSON.stringify(message));
  });

export function ensurePrefix(str: string) {
  if (!str.startsWith("system.") && !str.startsWith("aria2.")) {
    str = "aria2." + str;
  }
  return str;
}

export function addSecret(data: CallParam, secret?: string) {
  let params: CallParam[] = secret ? ["token:" + secret] : [];
  if (Array.isArray(data)) {
    params = params.concat(data);
  } else {
    params.push(data);
  }
  return params;
}

export const defaultOption = {
  server: "127.0.0.1:6800",
  timeout: 15000,
};
