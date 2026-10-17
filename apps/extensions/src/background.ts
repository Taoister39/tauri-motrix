import {
  classifyResource,
  defaults,
  isPreferences,
  isRequest,
  isResource,
  type Preferences,
  type Reply,
  type Request,
  type Resource,
  resourceName,
} from "./model";
import { callMotrix, handoffDownload } from "./rpc";

let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}
async function preferences(): Promise<Preferences> {
  const stored = (await chrome.storage.local.get("preferences")).preferences;
  return isPreferences(stored) ? stored : defaults;
}
async function rpc(
  method: "aria2.getVersion" | "aria2.addUri",
  params: unknown[] = [],
) {
  const secret: unknown = (await chrome.storage.session.get("secret")).secret;
  return callMotrix(
    await preferences(),
    typeof secret === "string" ? secret : "",
    method,
    params,
  );
}
const keyFor = (tabId: number) => `resources:${tabId}`;
async function resources(tabId: number): Promise<Resource[]> {
  const key = keyFor(tabId);
  const stored: unknown = (await chrome.storage.session.get(key))[key];
  return Array.isArray(stored) ? stored.filter(isResource) : [];
}

async function handle(request: Request): Promise<Reply> {
  if (request.type === "snapshot") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const notice: unknown = (await chrome.storage.session.get("notice")).notice;
    return {
      ok: true,
      snapshot: {
        preferences: await preferences(),
        resources: tab?.id === undefined ? [] : await resources(tab.id),
        tabId: tab?.id,
        tabTitle: tab?.title || "Current tab",
        tabUrl: tab?.url || "",
        notice: typeof notice === "string" ? notice : undefined,
      },
    };
  }
  if (request.type === "preferences") {
    if (
      (request.preferences.sniffing || request.preferences.takeover) &&
      !(await chrome.permissions.contains({
        origins: ["http://*/*", "https://*/*"],
      }))
    )
      return {
        ok: false,
        error: "Allow website access to enable this feature.",
      };
    await chrome.storage.local.set({ preferences: request.preferences });
    if (request.secret !== undefined)
      await chrome.storage.session.set({ secret: request.secret });
    return { ok: true };
  }
  if (request.type === "connect") {
    await rpc("aria2.getVersion");
    return { ok: true };
  }
  if (request.type === "clear") {
    await serialize(() => chrome.storage.session.remove(keyFor(request.tabId)));
    return { ok: true };
  }
  return serialize(async () => {
    const items = await resources(request.tabId);
    const sent: string[] = [],
      failed: string[] = [];
    for (const id of new Set(request.ids)) {
      const item = items.find((r) => r.id === id);
      if (!item || item.kind === "stream") {
        failed.push(id);
        continue;
      }
      if (item.sent) {
        sent.push(id);
        continue;
      }
      try {
        await rpc("aria2.addUri", [[item.url]]);
        item.sent = true;
        sent.push(id);
      } catch {
        failed.push(id);
      }
    }
    await chrome.storage.session.set({ [keyFor(request.tabId)]: items });
    return { ok: true, sent, failed };
  });
}

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, respond: (reply: Reply) => void) => {
    if (
      sender.id !== chrome.runtime.id ||
      !sender.url?.startsWith(chrome.runtime.getURL("")) ||
      !isRequest(message)
    )
      return false;
    void handle(message).then(respond, () =>
      respond({
        ok: false,
        error:
          "Could not reach Motrix. Open the desktop app and check connection settings.",
      }),
    );
    return true;
  },
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (
      details.tabId < 0 ||
      details.statusCode < 200 ||
      details.statusCode >= 300
    )
      return;
    const mime =
      details.responseHeaders
        ?.find((h) => h.name.toLowerCase() === "content-type")
        ?.value?.split(";")[0]
        .toLowerCase() || "";
    const kind = classifyResource(details.url, mime);
    if (!kind) return;
    void serialize(async () => {
      if (!(await preferences()).sniffing) return;
      const items = await resources(details.tabId);
      if (items.some((r) => r.url === details.url) || items.length >= 200)
        return;
      const length = Number(
        details.responseHeaders?.find(
          (h) => h.name.toLowerCase() === "content-length",
        )?.value,
      );
      items.push({
        id: crypto.randomUUID(),
        url: details.url,
        name: resourceName(details.url),
        kind,
        mime,
        size: Number.isFinite(length) && length >= 0 ? length : undefined,
      });
      await chrome.storage.session.set({ [keyFor(details.tabId)]: items });
    }).catch(() => undefined);
    return undefined;
  },
  { urls: ["http://*/*", "https://*/*"] },
  ["responseHeaders"],
);

chrome.tabs.onRemoved.addListener((id) => {
  void serialize(() => chrome.storage.session.remove(keyFor(id))).catch(
    () => undefined,
  );
});
chrome.permissions.onRemoved.addListener(() => {
  void (async () => {
    const allowed = await chrome.permissions.contains({
      origins: ["http://*/*", "https://*/*"],
    });
    if (!allowed)
      await chrome.storage.local.set({
        preferences: {
          ...(await preferences()),
          takeover: false,
          sniffing: false,
        },
      });
  })().catch(() => undefined);
});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.status === "loading")
    void serialize(() => chrome.storage.session.remove(keyFor(id))).catch(
      () => undefined,
    );
});
chrome.downloads.onCreated.addListener((item) => {
  if (
    item.state !== "in_progress" ||
    item.byExtensionId ||
    !/^https?:\/\//.test(item.url)
  )
    return;
  void (async () => {
    if (!(await preferences()).takeover) return;
    const notice = await handoffDownload(item.id, {
      pause: (id) => chrome.downloads.pause(id),
      send: () => rpc("aria2.addUri", [[item.finalUrl || item.url]]),
      cancel: (id) => chrome.downloads.cancel(id),
      resume: (id) => chrome.downloads.resume(id),
    });
    await chrome.storage.session.set({
      notice: notice || "Download sent to Motrix.",
    });
  })().catch(() => undefined);
});
