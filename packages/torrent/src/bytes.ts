import type { BinaryInput, TorrentHashes } from "./types";

export const textBytes = (text: string): Uint8Array =>
  new TextEncoder().encode(text);
export const bytesText = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);
export const bytesHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export function hexBytes(hex: string): Uint8Array {
  if (!/^(?:[a-f\d]{2})+$/i.test(hex))
    throw new Error("Invalid hexadecimal value");
  return Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16));
}

export function binaryBytes(input: BinaryInput): Uint8Array {
  return ArrayBuffer.isView(input)
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input);
}

export function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function normalizeV1Hash(hash: string): string {
  if (/^[a-f\d]{40}$/i.test(hash)) return hash.toLowerCase();
  if (!/^[a-z2-7]{32}$/i.test(hash)) throw new Error("Invalid v1 info hash");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const result: number[] = [];
  let value = 0;
  let bits = 0;
  for (const character of hash.toUpperCase()) {
    value = (value << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      result.push((value >>> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  return bytesHex(Uint8Array.from(result));
}

export function normalizeV2Hash(hash: string): string {
  if (!/^[a-f\d]{64}$/i.test(hash)) throw new Error("Invalid v2 info hash");
  return hash.toLowerCase();
}

export function torrentHashes(
  infoHash?: string,
  infoHashV2?: string,
): TorrentHashes {
  const v1 = infoHash === undefined ? undefined : normalizeV1Hash(infoHash);
  const v2 = infoHashV2 === undefined ? undefined : normalizeV2Hash(infoHashV2);
  if (v1 && v2) return { version: "hybrid", infoHash: v1, infoHashV2: v2 };
  if (v1) return { version: "v1", infoHash: v1 };
  if (v2) return { version: "v2", infoHashV2: v2 };
  throw new Error("Invalid torrent identifier");
}

export async function digest(
  algorithm: "SHA-1" | "SHA-256",
  bytes: Uint8Array,
): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle)
    throw new Error("Web Crypto is required to parse torrent files");
  return new Uint8Array(
    await globalThis.crypto.subtle.digest(
      algorithm,
      new Uint8Array(bytes).buffer,
    ),
  );
}
