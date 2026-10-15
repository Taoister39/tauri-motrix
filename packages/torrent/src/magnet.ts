import { normalizeV1Hash, normalizeV2Hash, torrentHashes } from "./bytes";
import type { MagnetInput, ParsedTorrentIdentifier } from "./types";

const MAX_SELECTION_COUNT = 1_048_576;
const unique = (values: string[]): string[] => [...new Set(values)];

function selection(values: string[]): number[] {
  const indices = new Set<number>();
  for (const value of values.flatMap((item) => item.split(","))) {
    if (!/^\d+(?:-\d+)?$/.test(value))
      throw new Error("Invalid magnet file selection");
    const [start, end = start] = value.split("-").map(Number);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      end < start ||
      end - start >= MAX_SELECTION_COUNT
    )
      throw new Error("Invalid magnet file selection");
    for (let index = start; index <= end; index++) {
      indices.add(index);
      if (indices.size > MAX_SELECTION_COUNT)
        throw new Error("Magnet file selection is too large");
    }
  }
  return [...indices].sort((left, right) => left - right);
}

function selectHash(previous: string | undefined, value: string): string {
  if (previous && previous !== value)
    throw new Error("Conflicting magnet info hashes");
  return value;
}

export function parseMagnet(uri: string): ParsedTorrentIdentifier {
  if (!/^(?:stream-)?magnet:\?/.test(uri))
    throw new Error("Invalid magnet URI");
  const parameters: Record<string, string[]> = Object.create(null);
  const keywords: string[] = [];
  for (const parameter of uri.slice(uri.indexOf("?") + 1).split("&")) {
    if (!parameter) continue;
    const separator = parameter.indexOf("=");
    if (separator <= 0) throw new Error("Invalid magnet parameter");
    const decode = (value: string): string =>
      decodeURIComponent(value.replace(/\+/g, " "));
    const key = decode(parameter.slice(0, separator));
    const value = decode(parameter.slice(separator + 1));
    if (key === "kt") {
      keywords.push(
        ...parameter
          .slice(separator + 1)
          .split("+")
          .map((word) => decodeURIComponent(word)),
      );
    }
    (parameters[key] ??= []).push(value);
  }
  let infoHash: string | undefined;
  let infoHashV2: string | undefined;
  for (const topic of parameters.xt ?? []) {
    if (topic.startsWith("urn:btih:"))
      infoHash = selectHash(infoHash, normalizeV1Hash(topic.slice(9)));
    if (topic.startsWith("urn:btmh:")) {
      if (!topic.startsWith("urn:btmh:1220"))
        throw new Error("Unsupported magnet multihash");
      infoHashV2 = selectHash(infoHashV2, normalizeV2Hash(topic.slice(13)));
    }
  }
  const result: ParsedTorrentIdentifier = {
    ...torrentHashes(infoHash, infoHashV2),
    kind: "identifier",
    parameters,
    announce: unique(parameters.tr ?? []),
    urlList: unique([...(parameters.as ?? []), ...(parameters.ws ?? [])]),
    peerAddresses: unique(parameters["x.pe"] ?? []),
  };
  if (parameters.dn) result.name = parameters.dn[0];
  if (parameters.kt) result.keywords = keywords;
  if (parameters.so) result.selectOnly = selection(parameters.so);
  for (const source of parameters.xs ?? []) {
    if (source.startsWith("urn:btpk:"))
      result.publicKey = normalizeV2Hash(source.slice(9));
  }
  return result;
}

function selectionRanges(indices: number[]): string {
  if (
    indices.length > MAX_SELECTION_COUNT ||
    indices.some((index) => !Number.isSafeInteger(index) || index < 0)
  )
    throw new Error("Invalid magnet file selection");
  const sorted = [...new Set(indices)].sort((left, right) => left - right);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    let end = start;
    while (sorted[i + 1] === end + 1) end = sorted[++i];
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  }
  return ranges.join(",");
}

export function encodeMagnet(input: MagnetInput): string {
  const hashes = torrentHashes(input.infoHash, input.infoHashV2);
  const parameters: Record<string, string[]> = Object.create(null);
  for (const [key, values] of Object.entries(input.parameters ?? {})) {
    if (
      !key ||
      !Array.isArray(values) ||
      values.some((value) => typeof value !== "string")
    )
      throw new Error("Invalid magnet parameter");
    parameters[key] = [...values];
  }
  parameters.xt = unique([
    ...(parameters.xt ?? []).filter(
      (topic) =>
        !topic.startsWith("urn:btih:") && !topic.startsWith("urn:btmh:"),
    ),
    ...(hashes.infoHash ? [`urn:btih:${hashes.infoHash}`] : []),
    ...(hashes.infoHashV2 ? [`urn:btmh:1220${hashes.infoHashV2}`] : []),
  ]);
  if (input.name !== undefined) parameters.dn = [input.name];
  if (input.announce !== undefined) parameters.tr = unique(input.announce);
  if (input.urlList !== undefined) {
    delete parameters.as;
    parameters.ws = unique(input.urlList);
  }
  if (input.peerAddresses !== undefined)
    parameters["x.pe"] = unique(input.peerAddresses);
  if (input.keywords !== undefined) parameters.kt = [input.keywords.join(" ")];
  if (input.selectOnly !== undefined)
    parameters.so = input.selectOnly.length
      ? [selectionRanges(input.selectOnly)]
      : [];
  if (input.publicKey !== undefined)
    parameters.xs = unique([
      ...(parameters.xs ?? []).filter(
        (source) => !source.startsWith("urn:btpk:"),
      ),
      `urn:btpk:${normalizeV2Hash(input.publicKey)}`,
    ]);
  const encoded = Object.entries(parameters).flatMap(([key, values]) =>
    values.map((value) => {
      if (typeof value !== "string")
        throw new Error("Invalid magnet parameter");
      if (key === "kt" && input.keywords !== undefined)
        return `kt=${input.keywords.map((word) => encodeURIComponent(word)).join("+")}`;
      const encodedValue = encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${key === "xt" ? encodedValue.replace(/%3A/g, ":") : encodedValue}`;
    }),
  );
  return `magnet:?${encoded.join("&")}`;
}
