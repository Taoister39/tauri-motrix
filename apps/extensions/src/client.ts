import {
  defaults,
  type Preferences,
  type Reply,
  type Request,
  type Snapshot,
} from "./model";

export const isExtension =
  typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
export async function request(message: Request): Promise<Reply> {
  if (!isExtension)
    return {
      ok: false,
      error:
        "Load the unpacked extension to connect to your browser and Motrix.",
    };
  return chrome.runtime.sendMessage(message);
}
export async function allowCapture() {
  return (
    isExtension &&
    chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] })
  );
}
export function emptySnapshot(preferences: Preferences = defaults): Snapshot {
  return {
    preferences,
    resources: [],
    tabTitle: "Browser preview",
    tabUrl: "",
  };
}
export function subscribe(refresh: () => void) {
  if (!isExtension) return () => undefined;
  chrome.storage.onChanged.addListener(refresh);
  chrome.tabs.onActivated.addListener(refresh);
  return () => {
    chrome.storage.onChanged.removeListener(refresh);
    chrome.tabs.onActivated.removeListener(refresh);
  };
}
