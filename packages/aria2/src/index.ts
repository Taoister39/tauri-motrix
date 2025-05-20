import { Aria2, Aria2InstanceConfig } from "./aria2";
import { defaultOption } from "./util";

export interface Aria2Instance
  extends Omit<Aria2, "handleMessage" | "dispatchEvent" | "dispatchOffline"> {
  <T>(...arr: Parameters<Aria2["call"]>): Promise<T>;
  create(config?: Partial<Aria2InstanceConfig>): Aria2Instance;
}

function createInstance(instanceConfig: Aria2InstanceConfig): Aria2Instance {
  const context = new Aria2(instanceConfig);

  const instance: Aria2Instance = (...arr) => context.call(...arr);

  instance.eventSubscribeMap = context.eventSubscribeMap;
  instance.offlineSubscribeMap = context.offlineSubscribeMap;
  instance.socketPendingMap = context.socketPendingMap;
  instance.fetcher = context.fetcher;
  instance.webSocketIns = context.webSocketIns;
  instance.instanceConfig = context.instanceConfig;

  instance.open = Aria2.prototype.open.bind(context);
  instance.close = Aria2.prototype.close.bind(context);
  instance.call = Aria2.prototype.call.bind(context);
  instance.multiCall = Aria2.prototype.multiCall.bind(context);
  instance.addListener = Aria2.prototype.addListener.bind(context);
  instance.setListener = Aria2.prototype.setListener.bind(context);
  instance.removeListener = Aria2.prototype.removeListener.bind(context);
  instance.removeAllListener = Aria2.prototype.removeAllListener.bind(context);
  instance.listNotifications = Aria2.prototype.listNotifications.bind(context);
  instance.listMethods = Aria2.prototype.listMethods.bind(context);

  instance.create = function create(config) {
    return createInstance({ ...instanceConfig, ...config });
  };

  return instance;
}

const aria2 = createInstance(defaultOption);

export const create = aria2.create;

export default aria2;

export { Aria2 };

export type {
  Aria2InstanceConfig,
  EventSubscribeMap,
  OfflineSubscribeMap,
  SocketPendingMap,
} from "./aria2";
export { ensurePrefix } from "./util";
