# @tauri-motrix/torrent

Dependency-free TypeScript utilities for BitTorrent v1, v2, and hybrid metadata,
magnet URIs, info hashes, and peer IDs. The package exports ESM and TypeScript
declarations and runs in modern browsers, Tauri WebViews, and Node.js 22 or later.

## Usage

```ts
import {
  decodeTorrentFile,
  encodeMagnet,
  encodeTorrentFile,
  parsePeerId,
  parseTorrent,
} from "@tauri-motrix/torrent";

const metadata = await decodeTorrentFile(file);
console.log(metadata.version, metadata.files);

const bytes = encodeTorrentFile(metadata.metainfo);
const magnet = encodeMagnet(metadata);
const identifier = await parseTorrent(magnet);
const peer = parsePeerId("%2DUT360W%2D%92%B6%EBh%1F%A1%DBfo%F6%D5I");
```

`file` is a `File`, `Blob`, `ArrayBuffer`, or `ArrayBufferView`. Binary views
respect their byte offset and length. Torrent parsing requires Web Crypto
(`crypto.subtle`), available in secure browser contexts and supported runtimes.

## API

| Export                        | Behavior                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseTorrent(input)`         | Returns a Promise for a torrent file or identifier. Accepts binary data, Blob/File, magnet URIs, raw hashes, magnet input objects, or previous results. |
| `decodeTorrentFile(input)`    | Returns a Promise for validated metadata, file entries, hashes, and the original metainfo.                                                              |
| `encodeTorrentFile(metainfo)` | Encodes a raw metainfo dictionary into canonical bencode bytes. Does not hash file contents or construct torrents from files.                           |
| `parseMagnet(uri)`            | Parses a magnet or stream-magnet URI synchronously.                                                                                                     |
| `encodeMagnet(input)`         | Encodes normalized fields and additional parameters synchronously. Explicit normalized fields override their corresponding parameters.                  |
| `parsePeerId(input)`          | Identifies a 20-byte peer ID from bytes, UTF-8 text, hexadecimal, or bytewise percent encoding.                                                         |

Validation errors throw English `Error` instances. Valid unrecognized peer IDs
return `{ client: "unknown" }`. Errors do not include the original input.

### Results and hashes

`ParsedTorrent` is a union of `ParsedTorrentIdentifier` (`kind: "identifier"`)
and `ParsedTorrentFile` (`kind: "torrent-file"`). Both identify their protocol
with `version: "v1" | "v2" | "hybrid"`:

- `infoHash` is the lowercase 40-character SHA-1 hash, present for v1 and hybrid.
- `infoHashV2` is the lowercase full 64-character SHA-256 hash, present for v2 and hybrid.
- Pure v2 results never substitute a truncated SHA-256 hash for `infoHash`.
- Raw v1 hashes accept hexadecimal, 32-character base32, or 20 bytes. Raw v2
  hashes accept hexadecimal or 32 bytes. Magnet v2 hashes use `urn:btmh:1220…`.

Torrent file results include `name`, `files`, `length`, `pieceLength`,
`lastPieceLength`, `announce`, `announceList`, `urlList`, `info`, `infoBuffer`,
and `metainfo`, plus optional creation, comment, and private metadata. V1 results
also contain `pieces`; v2 results contain `pieceLayers`, keyed by hexadecimal
pieces roots.

`TorrentFile` contains `name`, `path`, `length`, and `offset`, with optional
`padding` and `piecesRoot`. Paths use `/`. V1 and hybrid retain the v1 file list,
including padding entries, so consumers can preserve aria2's one-based file
indices. V2 paths come directly from the file tree without adding the advisory
torrent name; nonempty files begin on piece boundaries. V2 `length` excludes
alignment gaps while file offsets include them. Hybrid `length` includes its
explicit v1 padding files. `lastPieceLength` is zero for empty content.

### Raw dictionaries and encoding

```ts
import type { BencodeDictionary } from "@tauri-motrix/torrent";

const metainfo: BencodeDictionary = {
  entries: [{ key: new TextEncoder().encode("info"), value: metadata.info }],
};
```

`BencodeValue` supports integers (`number` or `bigint`), byte strings
(`Uint8Array`), lists, and dictionaries with raw byte keys. Unsafe integers
decode to `bigint`; file lengths and offsets must remain safe JavaScript integers.
Encoding sorts dictionary keys by bytes and rejects duplicates. Unknown metadata
and binary piece-layer keys survive round-trips. Edit `metainfo` to change
encoded fields; normalized result fields are derived views.

Parsing rejects noncanonical bencode, invalid paths, inconsistent piece counts,
unsupported metadata versions, invalid v2 piece layers, and inconsistent hybrid
file layouts. Hashes use the original encoded `info` bytes. Bencode nesting is
limited to 128 levels. V2 layer validation checks metadata hash relationships;
it cannot verify downloaded content without the actual files.

### Magnets and peer IDs

Magnet results preserve decoded repeated parameters in `parameters`, including
unknown extensions and source URIs. Normalized fields include `name`, `announce`,
`urlList`, `peerAddresses`, `keywords`, `selectOnly`, and `publicKey` when present.
File selections use zero-based BEP 53 indices; they do not use aria2's one-based
indices. Selection expansion is limited to 1,048,576 entries. Conflicting hashes
of the same version are rejected.

Peer identification preserves the upstream registry, detection order, and
implemented version formats, removes trailing version whitespace, and uses
English client names. Unsupported upstream version formats remain absent.
Percent encoding is decoded bytewise, so arbitrary binary suffixes are accepted.

This package performs no network requests, reads no filesystem paths, and
provides no CLI or download engine. The desktop application previews pure v2
torrents but prevents submission to its current aria2 engine; hybrid torrents
continue through the v1-compatible path.

## Development

From the repository root:

```sh
pnpm --filter @tauri-motrix/torrent build
pnpm --filter @tauri-motrix/torrent typecheck
pnpm build
pnpm test --selectProjects torrent --runInBand
```

## Acknowledgements

The peer registry and recognition behavior derive from `bittorrent-peerid`.
Torrent and magnet behavior is informed by `parse-torrent`, `magnet-uri`, and the
BitTorrent specifications. Upstream MIT notices are retained in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md), which is included in the package.
