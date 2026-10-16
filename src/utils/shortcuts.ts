export function recordShortcut(event: {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): string | null {
  if (
    !(event.ctrlKey || event.altKey || event.metaKey) ||
    !/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-9]|2[0-4]))$/.test(event.code)
  )
    return null;
  return [
    event.shiftKey && "shift",
    event.ctrlKey && "control",
    event.altKey && "alt",
    event.metaKey && "super",
    event.code,
  ]
    .filter(Boolean)
    .join("+");
}

export function formatShortcut(value: string, isMac: boolean): string {
  return value
    .split("+")
    .map((part) => {
      switch (part.toLowerCase()) {
        case "control":
          return "Ctrl";
        case "shift":
          return "Shift";
        case "alt":
          return isMac ? "Option" : "Alt";
        case "super":
          return isMac ? "Command" : "Super";
        default:
          return part.replace(/^(Key|Digit)/, "");
      }
    })
    .join(" + ");
}

export function clipboardDownloadLink(
  value: string | null | undefined,
): string {
  const text = value?.trim() ?? "";
  if (!text || /\s/.test(text)) return "";
  try {
    const url = new URL(text);
    if (/^(https?|ftp):$/.test(url.protocol)) {
      return url.hostname && /^(https?|ftp):\/\//i.test(text) ? text : "";
    }
    if (url.protocol === "magnet:") {
      const valid = url.searchParams
        .getAll("xt")
        .some((topic) =>
          /^(urn:btih:([a-f0-9]{40}|[a-z2-7]{32})|urn:btmh:1220[a-f0-9]{64})$/i.test(
            topic,
          ),
        );
      return valid && /^magnet:\?/i.test(text) ? text : "";
    }
  } catch {
    return "";
  }
  return "";
}
