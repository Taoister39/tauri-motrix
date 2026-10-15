import { bytesText, hexBytes, textBytes } from "./bytes";
import {
  azureusClients,
  mainlineClients,
  shadowClients,
  simpleClients,
  type VersionStyle,
} from "./peer-clients";
import type { ParsedPeerId } from "./types";

const azNames = new Map(azureusClients.map(([id, client]) => [id, client]));
const azVersions = new Map(
  azureusClients.map(([, client, style]) => [client, style]),
);
const shadowNames = new Map(shadowClients);
const mainlineNames = new Map(mainlineClients);

function versionNumber(value: string, style: VersionStyle): string | undefined {
  switch (style) {
    case "three":
      return `${value[0]}.${value[1]}.${value[2]}`;
    case "four":
      return value.split("").join(".");
    case "two":
      return `${value.slice(0, 2)}.${value.slice(2)}`;
    case "skip":
      return `${value[1]}.${value.slice(2)}`;
    case "deluge":
      return `${value[0]}.${value[1]}.${/\d/.test(value[2]) ? value[2] : `1${"ABCDE".indexOf(value[2])}`}`;
    case "mnemonic":
      return `${value[0]}.${value[1]}.${value[2]}${value[3] === "B" ? " Beta" : value[3] === "A" ? " Alpha" : ""}`;
    case "transmission":
      if (value.startsWith("000")) return `0.${value[3]}`;
      if (value.startsWith("00")) return `0.${value.slice(2)}`;
      return `${value[0]}.${value.slice(1, 3)}${value[3] === "Z" || value[3] === "X" ? "+" : ""}`;
    case "webtorrent":
      return `${value[0] === "0" ? value[1] : value.slice(0, 2)}.${value[2] === "0" ? value[3] : value.slice(2)}`;
    case "none":
      return undefined;
  }
}

function peerBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (typeof input !== "string") throw new Error("Invalid peer ID input");
  if (/^[a-f\d]{40}$/i.test(input)) return hexBytes(input);
  if (!input.includes("%")) return textBytes(input);
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "%") {
      const pair = input.slice(i + 1, i + 3);
      if (!/^[a-f\d]{2}$/i.test(pair))
        throw new Error("Invalid percent-encoded peer ID");
      bytes.push(parseInt(pair, 16));
      i += 2;
    } else {
      const byte = input.charCodeAt(i);
      if (byte > 255) throw new Error("Invalid percent-encoded peer ID");
      bytes.push(byte);
    }
  }
  return Uint8Array.from(bytes);
}

function specialClient(
  peer: string,
  bytes: Uint8Array,
): ParsedPeerId | undefined {
  if (peer.slice(2, 4) === "BS")
    return { client: "BitSpirit", version: String(bytes[1] || 1) };
  if (!["exbc", "FUTB", "xUTB"].some((prefix) => peer.startsWith(prefix)))
    return;
  const bitlord = peer.slice(6, 10) === "LORD";
  const modification = peer.startsWith("FUTB")
    ? " (Solidox Mod)"
    : peer.startsWith("xUTB")
      ? " (Mod 2)"
      : "";
  return {
    client: `${bitlord ? "BitLord" : "BitComet"}${modification}`,
    version: `${bytes[4]}.${String(bytes[5]).padStart(bitlord && bytes[4] !== 0 ? 1 : 2, "0")}`,
  };
}

function awkwardClient(bytes: Uint8Array): ParsedPeerId | undefined {
  const first = bytes.findIndex((byte) => byte > 0);
  if (
    first === 0 &&
    bytes.subarray(0, 16).every((byte) => byte > 0) &&
    bytes.subarray(16).every((byte, i) => byte === (bytes[i] ^ bytes[15 - i]))
  )
    return { client: "Shareaza" };
  if (first === 9 && bytes[9] === 3 && bytes[10] === 3 && bytes[11] === 3)
    return { client: "I2PSnark" };
  if (first === 12 && bytes[12] === 97 && bytes[13] === 97)
    return { client: "Experimental", version: "3.2.1b2" };
  if (first === 12) return { client: "Mainline" };
}

export function parsePeerId(input: string | Uint8Array): ParsedPeerId {
  const bytes = peerBytes(input);
  if (bytes.length !== 20)
    throw new Error("Peer ID must contain exactly 20 bytes");
  const peer = bytesText(bytes);
  if (peer.endsWith("UDP0") || peer.endsWith("HTTPBT"))
    return specialClient(peer, bytes) ?? { client: "BitSpirit?" };
  if (
    peer[0] === "-" &&
    (peer[7] === "-" ||
      ["FG", "LH", "NE", "KT", "SP"].includes(peer.slice(1, 3)))
  ) {
    let client = azNames.get(peer.slice(1, 3));
    if (client) {
      const version = versionNumber(peer.slice(3, 7), azVersions.get(client)!);
      if (client === "ZipTorrent" && peer.startsWith("bLAde", 8))
        client = "Unknown [Fake: ZipTorrent]";
      if (client === "µTorrent" && version === "6.0 Beta") client = "Mainline";
      if (client.startsWith("libTorrent (Rakshasa)")) client += " / rTorrent*";
      return { client, ...(version === undefined ? {} : { version }) };
    }
  }
  if (peer[5] === "-" && /^[a-z]$/i.test(peer[0]) && /^[\d-]$/.test(peer[1])) {
    let last = 4;
    while (last > 0 && peer[last] === "-") last--;
    if (!peer.slice(1, last + 1).includes("-")) {
      const client = shadowNames.get(peer[0]);
      if (client) return { client };
    }
  }
  if (
    peer[2] === "-" &&
    peer[7] === "-" &&
    (peer[4] === "-" || peer[5] === "-")
  ) {
    const client = mainlineNames.get(peer[0]);
    if (client) return { client };
  }
  const special = specialClient(peer, bytes);
  if (special) return special;
  for (const [id, client, version, position] of simpleClients) {
    if (peer.startsWith(id, position))
      return { client, ...(version === null ? {} : { version }) };
  }
  return awkwardClient(bytes) ?? { client: "unknown" };
}
