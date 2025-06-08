import {
  addSecret,
  CallParam,
  createFetcherFactory,
  ensurePrefix,
  MultiCall,
} from "./util";

export type EventSubscribeMap = Record<
  string,
  Array<(data: MessageEvent["data"]) => void> | void
>;

export type SocketPendingMap = Record<
  string,
  {
    resolve: (data: MessageEvent["data"]) => void;
    reject: (data: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>;

export type OfflineSubscribeMap = Record<
  string,
  Array<{
    time: number;
    data: unknown;
  }>
>;

export interface Aria2InstanceConfig {
  server: string;
  timeout: number;
  eventSubscribeMap?: EventSubscribeMap;
  offlineSubscribeMap?: OfflineSubscribeMap;
  socketPendingMap?: SocketPendingMap;
  isHttps?: boolean;
  isWss?: boolean;
  secret?: string;
}

export class Aria2 {
  eventSubscribeMap: EventSubscribeMap;
  offlineSubscribeMap: OfflineSubscribeMap;

  socketPendingMap: SocketPendingMap;

  webSocketIns?: WebSocket;
  fetcher: ReturnType<typeof createFetcherFactory>;

  instanceConfig: Aria2InstanceConfig;

  constructor(instanceConfig: Aria2InstanceConfig) {
    const {
      server,
      eventSubscribeMap,
      socketPendingMap,
      isHttps,
      timeout,
      offlineSubscribeMap,
    } = instanceConfig;

    this.fetcher = createFetcherFactory(
      `${isHttps ? "https" : "http"}://${server}/jsonrpc`,
      timeout,
    );

    this.eventSubscribeMap = eventSubscribeMap || {};
    this.offlineSubscribeMap = offlineSubscribeMap || {};
    this.socketPendingMap = socketPendingMap || {};
    this.instanceConfig = instanceConfig;
  }

  open() {
    const { server, isWss } = this.instanceConfig;
    const webSocketIns = new WebSocket(
      `${isWss ? "wss" : "ws"}://${server}/jsonrpc`,
    );
    this.webSocketIns = webSocketIns;

    webSocketIns.onopen = (event) => {
      console.log("aria2", "WebSocket OPEN");
      this.dispatchEvent("open", event);
    };

    webSocketIns.onclose = (event) => {
      console.log("aria2", "WebSocket CLOSE");
      this.dispatchEvent("close", event);
    };

    webSocketIns.onmessage = (message: MessageEvent) => {
      let data;
      try {
        data = JSON.parse(message.data);
      } catch (err) {
        console.error("aria2", "JSON parse failed", err, message);
        this.dispatchEvent("error", err);
        return;
      }

      this.#handleMessage(data);
    };

    webSocketIns.onerror = (error) => {
      console.error("aria2", "WebSocket ERROR", error);
      this.dispatchEvent("error", error);
    };
  }

  #handleMessage(data: MessageEvent["data"]) {
    if (Array.isArray(data)) {
      return data.forEach((item) => this.#handleMessage(item));
    }
    const { socketPendingMap } = this;
    const { method: key, id: messageId } = data;

    if (!messageId) {
      this.dispatchEvent(key, data.params);
    }

    if (!key && messageId in socketPendingMap) {
      const pending = socketPendingMap[messageId];
      clearTimeout(pending.timer);
      delete socketPendingMap[messageId];
      if (data.error) {
        pending.reject(data.error);
      } else {
        pending.resolve(data.result);
      }
    }
  }

  call<T>(method: string, ...params: CallParam[]): Promise<T> {
    const { socketPendingMap, webSocketIns, fetcher, instanceConfig } = this;

    const message = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: ensurePrefix(method),
      params: addSecret(params, instanceConfig.secret),
    };

    if (webSocketIns?.readyState === WebSocket.OPEN) {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          delete socketPendingMap[message.id];
          reject(new Error("Request timed out."));
        }, instanceConfig.timeout);
        socketPendingMap[message.id] = { resolve, reject, timer };
        webSocketIns.send(JSON.stringify(message));
      });
    }

    return fetcher<T>(message);
  }

  multiCall<T>(calls: MultiCall) {
    const multi = [
      calls.map(({ method, params }) => {
        return {
          methodName: ensurePrefix(method),
          params: params,
        };
      }),
    ];
    return this.call<T>("system.multicall", ...multi);
  }

  dispatchEvent(name: string, data: unknown) {
    const callbacks = this.eventSubscribeMap[name];

    if (callbacks) {
      callbacks.forEach((fn) => fn(data));
    } else {
      this.offlineSubscribeMap[name] ??= [];
      this.offlineSubscribeMap[name].push({
        data,
        time: Date.now(),
      });
    }
  }

  dispatchOffline<T>(method: string, callback: (data: T) => void): boolean {
    const { offlineSubscribeMap } = this;

    if (method in offlineSubscribeMap) {
      offlineSubscribeMap[method].forEach(({ data, time }) => {
        console.log(`offline queue call ${method}, cached at ${time}`);
        callback(data as T);
      });
      delete offlineSubscribeMap[method];
      return true;
    }
    return false;
  }

  addListener<T>(method: string, callback: (data: T) => void) {
    if (this.dispatchOffline(method, callback)) {
      return;
    }

    const key = ensurePrefix(method);
    const { eventSubscribeMap } = this;
    if (eventSubscribeMap[key]?.includes(callback)) {
      return;
    }

    eventSubscribeMap[key] ??= [];
    eventSubscribeMap[key].push(callback);
  }

  setListener<T>(method: string, callback: (data: T) => void) {
    if (this.dispatchOffline(method, callback)) {
      return;
    }

    const key = ensurePrefix(method);
    this.eventSubscribeMap[key] = [callback];
  }

  removeListener<T>(method: string, callback: (data: T) => void) {
    const { eventSubscribeMap } = this;
    const key = ensurePrefix(method);
    const callbacks = eventSubscribeMap[key];
    eventSubscribeMap[key] = callbacks?.filter((fn) => fn !== callback);
  }

  removeAllListener(method: string) {
    const { eventSubscribeMap } = this;
    const key = ensurePrefix(method);
    delete eventSubscribeMap[key];
  }

  listNotifications() {
    return this.call<string[]>("system.listNotifications");
  }

  listMethods() {
    return this.call<string[]>("system.listMethods");
  }

  close() {
    this.webSocketIns?.close();
  }
}
