import { bytesText, compareBytes, concatBytes, textBytes } from "./bytes";
import type { BencodeDictionary, BencodeValue } from "./types";

export function isDictionary(
  value: BencodeValue | undefined,
): value is BencodeDictionary {
  return (
    !!value &&
    typeof value === "object" &&
    "entries" in value &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
  );
}

export function getValue(
  dictionary: BencodeDictionary,
  key: string,
): BencodeValue | undefined {
  const encodedKey = textBytes(key);
  return dictionary.entries.find(
    (entry) => compareBytes(entry.key, encodedKey) === 0,
  )?.value;
}

export function decodeBencode(bytes: Uint8Array): {
  value: BencodeValue;
  infoBuffer?: Uint8Array;
} {
  let offset = 0;
  let infoBuffer: Uint8Array | undefined;
  const fail = (): never => {
    throw new Error("Invalid bencode data");
  };
  const read = (depth: number): BencodeValue => {
    if (depth > 128 || offset >= bytes.length) return fail();
    const marker = bytes[offset];
    if (marker >= 48 && marker <= 57) {
      const start = offset;
      while (bytes[offset] >= 48 && bytes[offset] <= 57) offset++;
      if (bytes[offset++] !== 58) return fail();
      const digits = bytesText(bytes.subarray(start, offset - 1));
      if (!/^(0|[1-9]\d*)$/.test(digits)) return fail();
      const length = Number(digits);
      if (!Number.isSafeInteger(length) || length > bytes.length - offset)
        return fail();
      const value = bytes.slice(offset, offset + length);
      offset += length;
      return value;
    }
    offset++;
    if (marker === 105) {
      const start = offset;
      while (offset < bytes.length && bytes[offset] !== 101) offset++;
      if (offset === bytes.length) return fail();
      const digits = bytesText(bytes.subarray(start, offset++));
      if (!/^(0|-?[1-9]\d*)$/.test(digits)) return fail();
      const value = BigInt(digits);
      return value >= BigInt(Number.MIN_SAFE_INTEGER) &&
        value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(value)
        : value;
    }
    if (marker === 108) {
      const values: BencodeValue[] = [];
      while (offset < bytes.length && bytes[offset] !== 101)
        values.push(read(depth + 1));
      if (bytes[offset++] !== 101) return fail();
      return values;
    }
    if (marker === 100) {
      const entries: BencodeDictionary["entries"] = [];
      while (offset < bytes.length && bytes[offset] !== 101) {
        const key = read(depth + 1);
        if (
          !(key instanceof Uint8Array) ||
          (entries.length &&
            compareBytes(entries[entries.length - 1].key, key) >= 0)
        )
          return fail();
        const start = offset;
        const value = read(depth + 1);
        if (depth === 0 && compareBytes(key, textBytes("info")) === 0)
          infoBuffer = bytes.slice(start, offset);
        entries.push({ key, value });
      }
      if (bytes[offset++] !== 101) return fail();
      return { entries };
    }
    return fail();
  };
  const value = read(0);
  if (offset !== bytes.length) fail();
  return { value, infoBuffer };
}

export function encodeBencode(value: BencodeValue, depth = 0): Uint8Array {
  if (depth > 128) throw new Error("Bencode nesting is too deep");
  if (value instanceof Uint8Array)
    return concatBytes([textBytes(`${value.length}:`), value]);
  if (typeof value === "number" || typeof value === "bigint") {
    if (typeof value === "number" && !Number.isSafeInteger(value))
      throw new Error("Bencode integers must be safe integers or bigint");
    return textBytes(`i${value}e`);
  }
  if (Array.isArray(value))
    return concatBytes([
      textBytes("l"),
      ...value.map((item) => encodeBencode(item, depth + 1)),
      textBytes("e"),
    ]);
  if (!isDictionary(value)) throw new Error("Invalid bencode value");
  const entries = [...value.entries].sort((left, right) =>
    compareBytes(left.key, right.key),
  );
  const parts = [textBytes("d")];
  for (let i = 0; i < entries.length; i++) {
    const { key, value: item } = entries[i];
    if (
      !(key instanceof Uint8Array) ||
      (i > 0 && compareBytes(entries[i - 1].key, key) === 0)
    )
      throw new Error("Invalid bencode dictionary key");
    parts.push(encodeBencode(key, depth + 1), encodeBencode(item, depth + 1));
  }
  parts.push(textBytes("e"));
  return concatBytes(parts);
}
