export type ResourceKind = "video" | "audio" | "image" | "file" | "stream";
export type ThemeMode = "light" | "dark" | "system";
export const selectionLimit = 20;
export interface Preferences {
  takeover: boolean;
  sniffing: boolean;
  port: number;
  theme: ThemeMode;
}
export interface Resource {
  id: string;
  url: string;
  name: string;
  kind: ResourceKind;
  mime: string;
  size?: number;
  sent?: boolean;
}
export interface Snapshot {
  preferences: Preferences;
  resources: Resource[];
  tabId?: number;
  tabTitle: string;
  tabUrl: string;
  notice?: string;
}
export function selectResources(resources: Resource[], ids: string[]) {
  const available = new Set(
    resources.filter((r) => !r.sent && r.kind !== "stream").map((r) => r.id),
  );
  return [...new Set(ids)]
    .filter((id) => available.has(id))
    .slice(0, selectionLimit);
}
export type Request =
  | { type: "snapshot" }
  | { type: "preferences"; preferences: Preferences; secret?: string }
  | { type: "connect" }
  | { type: "clear"; tabId: number }
  | { type: "send"; tabId: number; ids: string[] };
export type Reply =
  | { ok: true; snapshot?: Snapshot; sent?: string[]; failed?: string[] }
  | { ok: false; error: string };
export const defaults: Preferences = {
  takeover: false,
  sniffing: false,
  port: 16801,
  theme: "system",
};

export function isResource(value: unknown): value is Resource {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<Resource>;
  return (
    typeof r.id === "string" &&
    typeof r.url === "string" &&
    typeof r.name === "string" &&
    typeof r.mime === "string" &&
    classifyResource(r.url, r.mime) === r.kind &&
    r.kind !== undefined &&
    (r.size === undefined || (Number.isFinite(r.size) && r.size >= 0)) &&
    (r.sent === undefined || typeof r.sent === "boolean")
  );
}

export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Preferences>;
  return (
    typeof p.takeover === "boolean" &&
    typeof p.sniffing === "boolean" &&
    Number.isInteger(p.port) &&
    p.port! > 0 &&
    p.port! <= 65535 &&
    ["light", "dark", "system"].includes(p.theme ?? "")
  );
}

export function isRequest(value: unknown): value is Request {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  if (["snapshot", "connect"].includes(String(value.type))) return true;
  if (value.type === "preferences")
    return (
      "preferences" in value &&
      isPreferences(value.preferences) &&
      (!("secret" in value) ||
        (typeof value.secret === "string" && value.secret.length <= 4096))
    );
  if (
    !("tabId" in value) ||
    !Number.isInteger(value.tabId) ||
    Number(value.tabId) < 0
  )
    return false;
  return (
    value.type === "clear" ||
    (value.type === "send" &&
      "ids" in value &&
      Array.isArray(value.ids) &&
      value.ids.length <= selectionLimit &&
      value.ids.every((id) => typeof id === "string"))
  );
}

export function classifyResource(
  url: string,
  mime = "",
): ResourceKind | undefined {
  let path: string;
  try {
    const parsed = new URL(url);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return;
    path = parsed.pathname.toLowerCase();
  } catch {
    return;
  }
  if (/mpegurl|dash\+xml/i.test(mime) || /\.(m3u8|mpd)$/.test(path))
    return "stream";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/.test(path))
    return "video";
  if (mime.startsWith("audio/") || /\.(mp3|m4a|ogg|flac|wav)$/.test(path))
    return "audio";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif)$/.test(path))
    return "image";
  if (
    /\.(zip|7z|rar|pdf|exe|msi|dmg|iso|torrent)$/.test(path) ||
    /application\/(octet-stream|pdf|zip)/i.test(mime)
  )
    return "file";
}

export function resourceName(url: string) {
  const path = new URL(url).pathname.split("/").pop();
  try {
    return decodeURIComponent(path || "Untitled resource").slice(0, 200);
  } catch {
    return path || "Untitled resource";
  }
}

export function formatSize(size?: number) {
  if (size === undefined) return "Size unknown";
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}
