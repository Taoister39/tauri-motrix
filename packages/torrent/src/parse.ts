import {
  decodeBencode,
  encodeBencode,
  getValue,
  isDictionary,
} from "./bencode";
import {
  binaryBytes,
  bytesHex,
  bytesText,
  concatBytes,
  digest,
  torrentHashes,
} from "./bytes";
import { encodeMagnet, parseMagnet } from "./magnet";
import type {
  BencodeDictionary,
  BencodeValue,
  BinaryInput,
  ParsedTorrent,
  ParsedTorrentFile,
  TorrentFile,
  TorrentInput,
} from "./types";

function dictionary(
  value: BencodeValue | undefined,
  field: string,
): BencodeDictionary {
  if (!isDictionary(value))
    throw new Error(`Invalid torrent dictionary: ${field}`);
  return value;
}

function byteString(
  value: BencodeValue | undefined,
  field: string,
): Uint8Array {
  if (!(value instanceof Uint8Array))
    throw new Error(`Invalid torrent byte string: ${field}`);
  return value;
}

function integer(value: BencodeValue | undefined, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid torrent integer: ${field}`);
  return value;
}

function addLength(left: number, right: number): number {
  return integer(left + right, "total length");
}

function component(value: Uint8Array): string {
  const text = bytesText(value);
  if (
    !text ||
    text === "." ||
    text === ".." ||
    /[\\/\0]/.test(text) ||
    /^[a-z]:/i.test(text)
  )
    throw new Error("Invalid torrent path component");
  return text;
}

function textList(value: BencodeValue | undefined, field: string): string[] {
  if (value === undefined) return [];
  if (value instanceof Uint8Array)
    return value.length ? [bytesText(value)] : [];
  if (!Array.isArray(value)) throw new Error(`Invalid torrent list: ${field}`);
  return value.map((entry) => bytesText(byteString(entry, field)));
}

function v1Files(info: BencodeDictionary, name: string): TorrentFile[] {
  const multiple = getValue(info, "files");
  const single = getValue(info, "length");
  if ((multiple === undefined) === (single === undefined))
    throw new Error("Torrent must contain exactly one v1 file layout");
  const values = multiple === undefined ? [info] : multiple;
  if (!Array.isArray(values) || !values.length)
    throw new Error("Invalid torrent file list");
  let offset = 0;
  return values.map((value) => {
    const file = dictionary(value, "files");
    const length = integer(getValue(file, "length"), "file length");
    const pathValue = getValue(file, "path.utf-8") ?? getValue(file, "path");
    let parts = [name];
    if (multiple !== undefined) {
      if (!Array.isArray(pathValue) || !pathValue.length)
        throw new Error("Invalid torrent file path");
      parts = [
        ...parts,
        ...pathValue.map((part) => component(byteString(part, "path"))),
      ];
    }
    const attributes = getValue(file, "attr");
    const padding =
      attributes !== undefined &&
      bytesText(byteString(attributes, "attr")).includes("p");
    const result: TorrentFile = {
      name: parts[parts.length - 1],
      path: parts.join("/"),
      length,
      offset,
      ...(padding ? { padding: true } : {}),
    };
    offset = addLength(offset, length);
    return result;
  });
}

function v2Files(info: BencodeDictionary, pieceLength: number): TorrentFile[] {
  const tree = dictionary(getValue(info, "file tree"), "file tree");
  const files: TorrentFile[] = [];
  const paths = new Set<string>();
  let offset = 0;
  const visit = (node: BencodeDictionary, parts: string[]): void => {
    const leaf = getValue(node, "");
    if (leaf !== undefined) {
      if (!parts.length || node.entries.length !== 1)
        throw new Error("Invalid torrent file tree leaf");
      const properties = dictionary(leaf, "file tree leaf");
      const length = integer(getValue(properties, "length"), "file length");
      const rootValue = getValue(properties, "pieces root");
      const root =
        rootValue === undefined
          ? undefined
          : byteString(rootValue, "pieces root");
      if (
        (length > 0 && !root) ||
        (root && (length === 0 || root.length !== 32))
      )
        throw new Error("Invalid torrent pieces root");
      if (length > 0)
        offset = addLength(
          offset,
          (pieceLength - (offset % pieceLength)) % pieceLength,
        );
      const path = parts.join("/");
      if (paths.has(path)) throw new Error("Duplicate torrent file path");
      paths.add(path);
      files.push({
        name: parts[parts.length - 1],
        path,
        length,
        offset,
        ...(root ? { piecesRoot: bytesHex(root) } : {}),
      });
      offset = addLength(offset, length);
      return;
    }
    if (!node.entries.length) throw new Error("Empty torrent directory");
    for (const entry of node.entries)
      visit(dictionary(entry.value, "file tree node"), [
        ...parts,
        component(entry.key),
      ]);
  };
  visit(tree, []);
  return files;
}

async function validateLayers(
  metainfo: BencodeDictionary,
  files: TorrentFile[],
  pieceLength: number,
): Promise<Map<string, Uint8Array>> {
  const layers = dictionary(getValue(metainfo, "piece layers"), "piece layers");
  const result = new Map<string, Uint8Array>();
  for (const { key, value } of layers.entries) {
    if (key.length !== 32) throw new Error("Invalid piece layer key");
    result.set(bytesHex(key), byteString(value, "piece layer"));
  }
  const requiredRoots = new Set<string>();
  let paddingHash: Uint8Array = new Uint8Array(32);
  for (let blockSize = 16_384; blockSize < pieceLength; blockSize *= 2)
    paddingHash = await digest(
      "SHA-256",
      concatBytes([paddingHash, paddingHash]),
    );
  for (const file of files) {
    if (file.length <= pieceLength) continue;
    const root = file.piecesRoot!;
    requiredRoots.add(root);
    const layer = result.get(root);
    const count = Math.ceil(file.length / pieceLength);
    if (!layer || layer.length / 32 !== count)
      throw new Error("Invalid or missing torrent piece layer");
    let hashes: Uint8Array[] = [];
    for (let offset = 0; offset < layer.length; offset += 32)
      hashes.push(layer.slice(offset, offset + 32));
    const width = 2 ** Math.ceil(Math.log2(count));
    while (hashes.length < width) hashes.push(paddingHash);
    while (hashes.length > 1) {
      const next: Uint8Array[] = [];
      for (let i = 0; i < hashes.length; i += 2)
        next.push(
          await digest("SHA-256", concatBytes([hashes[i], hashes[i + 1]])),
        );
      hashes = next;
    }
    if (bytesHex(hashes[0]) !== root)
      throw new Error("Torrent piece layer does not match pieces root");
  }
  if ([...result.keys()].some((root) => !requiredRoots.has(root)))
    throw new Error("Unexpected torrent piece layer");
  return result;
}

function validateHybrid(
  v1: TorrentFile[],
  v2: TorrentFile[],
  pieceLength: number,
  name: string,
): void {
  const actual = v1.filter((file) => !file.padding);
  if (actual.length !== v2.length)
    throw new Error("Inconsistent hybrid torrent file count");
  for (let i = 0; i < actual.length; i++) {
    const left = actual[i];
    const right = v2[i];
    const relative =
      v1.length === 1 && left.path === name
        ? left.path
        : left.path.slice(name.length + 1);
    if (
      relative !== right.path ||
      left.length !== right.length ||
      (left.length > 0 && left.offset !== right.offset)
    )
      throw new Error("Inconsistent hybrid torrent file layout");
    left.piecesRoot = right.piecesRoot;
  }
  for (let i = 0; i < v1.length; i++) {
    const file = v1[i];
    if (
      file.padding &&
      (i === 0 ||
        v1[i - 1].padding ||
        file.length !==
          (pieceLength - (file.offset % pieceLength)) % pieceLength ||
        file.length === 0)
    )
      throw new Error("Invalid hybrid torrent padding");
  }
}

async function inputBytes(input: BinaryInput | Blob): Promise<Uint8Array> {
  if (typeof Blob !== "undefined" && input instanceof Blob)
    return new Uint8Array(await input.arrayBuffer());
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input))
    return binaryBytes(input);
  throw new Error("Invalid torrent binary input");
}

export async function decodeTorrentFile(
  input: BinaryInput | Blob,
): Promise<ParsedTorrentFile> {
  const { value, infoBuffer } = decodeBencode(await inputBytes(input));
  const metainfo = dictionary(value, "metainfo");
  const info = dictionary(getValue(metainfo, "info"), "info");
  const metaVersion = getValue(info, "meta version");
  if (metaVersion !== undefined && metaVersion !== 2)
    throw new Error("Unsupported torrent metadata version");
  const hasV2 = metaVersion === 2;
  const hasV1 =
    !hasV2 ||
    getValue(info, "pieces") !== undefined ||
    getValue(info, "files") !== undefined ||
    getValue(info, "length") !== undefined;
  const nameBytes = byteString(
    getValue(info, "name.utf-8") ?? getValue(info, "name"),
    "name",
  );
  const name = hasV1 ? component(nameBytes) : bytesText(nameBytes);
  const pieceLength = integer(getValue(info, "piece length"), "piece length");
  if (
    !pieceLength ||
    (hasV2 &&
      (pieceLength < 16_384 ||
        2 ** Math.round(Math.log2(pieceLength)) !== pieceLength))
  )
    throw new Error("Invalid torrent piece length");
  const oldFiles = hasV1 ? v1Files(info, name) : undefined;
  const newFiles = hasV2 ? v2Files(info, pieceLength) : undefined;
  const files = oldFiles ?? newFiles!;
  const length = files.reduce((sum, file) => addLength(sum, file.length), 0);
  let pieces: string[] | undefined;
  if (hasV1) {
    const bytes = byteString(getValue(info, "pieces"), "pieces");
    if (bytes.length / 20 !== Math.ceil(length / pieceLength))
      throw new Error("Invalid torrent piece count");
    pieces = [];
    for (let offset = 0; offset < bytes.length; offset += 20)
      pieces.push(bytesHex(bytes.subarray(offset, offset + 20)));
  }
  const pieceLayers = newFiles
    ? await validateLayers(metainfo, newFiles, pieceLength)
    : undefined;
  if (oldFiles && newFiles)
    validateHybrid(oldFiles, newFiles, pieceLength, name);
  const infoHash = hasV1
    ? bytesHex(await digest("SHA-1", infoBuffer!))
    : undefined;
  const infoHashV2 = hasV2
    ? bytesHex(await digest("SHA-256", infoBuffer!))
    : undefined;
  const tiersValue = getValue(metainfo, "announce-list");
  if (tiersValue !== undefined && !Array.isArray(tiersValue))
    throw new Error("Invalid announce list");
  const announceList = Array.isArray(tiersValue)
    ? tiersValue.map((tier) => {
        if (!Array.isArray(tier)) throw new Error("Invalid announce tier");
        return textList(tier, "announce-list");
      })
    : [];
  const announce = [
    ...new Set(
      announceList.length
        ? announceList.flat()
        : textList(getValue(metainfo, "announce"), "announce"),
    ),
  ];
  const lastFile = [...files].reverse().find((file) => file.length > 0);
  const result: ParsedTorrentFile = {
    ...torrentHashes(infoHash, infoHashV2),
    kind: "torrent-file",
    name,
    announce,
    announceList,
    urlList: [...new Set(textList(getValue(metainfo, "url-list"), "url-list"))],
    files,
    length,
    pieceLength,
    lastPieceLength: lastFile
      ? (lastFile.length + lastFile.offset) % pieceLength || pieceLength
      : 0,
    info,
    infoBuffer: infoBuffer!,
    metainfo,
    ...(pieces ? { pieces } : {}),
    ...(pieceLayers ? { pieceLayers } : {}),
  };
  const privateValue = getValue(info, "private");
  if (privateValue !== undefined)
    result.private = integer(privateValue, "private") !== 0;
  const created = getValue(metainfo, "creation date");
  if (created !== undefined) {
    result.created = new Date(integer(created, "creation date") * 1000);
    if (Number.isNaN(result.created.getTime()))
      throw new Error("Invalid torrent creation date");
  }
  for (const [key, field] of [
    ["created by", "createdBy"],
    ["comment", "comment"],
  ] as const) {
    const value = getValue(metainfo, key);
    if (value !== undefined) result[field] = bytesText(byteString(value, key));
  }
  return result;
}

export function encodeTorrentFile(metainfo: BencodeDictionary): Uint8Array {
  dictionary(getValue(dictionary(metainfo, "metainfo"), "info"), "info");
  return encodeBencode(metainfo);
}

export async function parseTorrent(
  input: TorrentInput,
): Promise<ParsedTorrent> {
  if (typeof input === "string") {
    if (/^(?:stream-)?magnet:/.test(input)) return parseMagnet(input);
    return parseMagnet(
      encodeMagnet(
        input.length === 64 ? { infoHashV2: input } : { infoHash: input },
      ),
    );
  }
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    const bytes = binaryBytes(input);
    if (bytes.length === 20 || bytes.length === 32)
      return parseTorrent(bytesHex(bytes));
    return decodeTorrentFile(bytes);
  }
  if (typeof Blob !== "undefined" && input instanceof Blob)
    return decodeTorrentFile(input);
  if (input && typeof input === "object") {
    if ("kind" in input && input.kind === "torrent-file")
      return decodeTorrentFile(encodeTorrentFile(input.metainfo));
    if ("infoHash" in input || "infoHashV2" in input)
      return parseMagnet(encodeMagnet(input));
  }
  throw new Error("Invalid torrent identifier");
}
