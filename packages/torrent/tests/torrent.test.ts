import { createHash, webcrypto } from "node:crypto";

import {
  type BencodeDictionary,
  type BencodeValue,
  decodeTorrentFile,
  encodeTorrentFile,
  parseTorrent,
} from "@tauri-motrix/torrent";

const text = (value: string) => new TextEncoder().encode(value);
const sha = (algorithm: string, bytes: Uint8Array) =>
  createHash(algorithm).update(bytes).digest();
const dict = (fields: Record<string, BencodeValue>): BencodeDictionary => ({
  entries: Object.entries(fields).map(([key, value]) => ({
    key: text(key),
    value,
  })),
});
const v1Info = (fields: Record<string, BencodeValue> = {}) =>
  dict({
    name: text("a"),
    length: 1,
    "piece length": 16384,
    pieces: new Uint8Array(20),
    ...fields,
  });
const leaf = (length: number, root: Uint8Array = new Uint8Array(32).fill(1)) =>
  dict({ "": dict({ length, ...(length ? { "pieces root": root } : {}) }) });
const v2Info = (fields: Record<string, BencodeValue> = {}) =>
  dict({
    name: text("display name"),
    "meta version": 2,
    "piece length": 16384,
    "file tree": dict({ a: leaf(1) }),
    ...fields,
  });
const torrent = (
  info: BencodeDictionary,
  fields: Record<string, BencodeValue> = {},
) => encodeTorrentFile(dict({ info, ...fields }));
const v2Torrent = (
  fields: Record<string, BencodeValue> = {},
  outer: Record<string, BencodeValue> = {},
) => torrent(v2Info(fields), { "piece layers": dict({}), ...outer });

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
});

it("hashes the original v1 info bytes and preserves binary extensions on round-trip", async () => {
  const info = Buffer.concat([
    Buffer.from("d6:lengthi1e4:name1:a12:piece lengthi16384e6:pieces20:"),
    Buffer.alloc(20),
    Buffer.from("e"),
  ]);
  const bytes = Buffer.concat([Buffer.from("d4:info"), info, Buffer.from("e")]);
  const parsed = await decodeTorrentFile(bytes);
  expect(parsed).toMatchObject({
    version: "v1",
    name: "a",
    length: 1,
    pieceLength: 16384,
    lastPieceLength: 1,
    infoHash: sha("sha1", info).toString("hex"),
    files: [{ name: "a", path: "a", length: 1, offset: 0 }],
  });
  expect(Buffer.from(parsed.infoBuffer)).toEqual(info);
  expect(Buffer.from(encodeTorrentFile(parsed.metainfo))).toEqual(bytes);
  const extended = dict({
    info: v1Info(),
    extension: {
      entries: [{ key: Uint8Array.of(0xff, 0), value: 9007199254740993n }],
    },
  });
  const roundtrip = await decodeTorrentFile(encodeTorrentFile(extended));
  expect(encodeTorrentFile(roundtrip.metainfo)).toEqual(
    encodeTorrentFile(extended),
  );
  expect(await parseTorrent(roundtrip)).toEqual(roundtrip);
});

it("supports binary views with byte offsets, ArrayBuffer and Blob inputs", async () => {
  const bytes = torrent(v1Info());
  const padded = new Uint8Array(bytes.length + 10);
  padded.set(bytes, 5);
  const view = new DataView(padded.buffer, 5, bytes.length);
  const buffer = new Uint8Array(bytes).buffer;
  for (const input of [
    view,
    buffer,
    new Blob([buffer]),
    new File([buffer], "a.torrent"),
  ]) {
    expect(await parseTorrent(input)).toMatchObject({
      kind: "torrent-file",
      version: "v1",
      name: "a",
    });
  }
});

it("preserves UTF-8 file order, offsets, trackers, metadata and webseeds", async () => {
  const info = dict({
    name: text("fallback"),
    "name.utf-8": text("café"),
    "piece length": 16384,
    pieces: new Uint8Array(20),
    private: 1,
    files: [
      dict({
        length: 1,
        path: [text("fallback")],
        "path.utf-8": [text("été.txt")],
      }),
      dict({ length: 2, path: [text("second")] }),
    ],
  });
  const parsed = await decodeTorrentFile(
    torrent(info, {
      announce: text("ignored"),
      "announce-list": [
        [text("https://t.test"), text("https://t.test")],
        [text("udp://t.test")],
      ],
      "url-list": [text("https://w.test"), text("https://w.test")],
      "creation date": 1,
      "created by": text("Creator"),
      comment: text("Comment"),
    }),
  );
  expect(parsed).toMatchObject({
    name: "café",
    length: 3,
    private: true,
    created: new Date(1000),
    createdBy: "Creator",
    comment: "Comment",
    announce: ["https://t.test", "udp://t.test"],
    urlList: ["https://w.test"],
    files: [
      { name: "été.txt", path: "café/été.txt", length: 1, offset: 0 },
      { name: "second", path: "café/second", length: 2, offset: 1 },
    ],
  });
  expect(await decodeTorrentFile(encodeTorrentFile(parsed.metainfo))).toEqual(
    parsed,
  );
});

it("supports zero-length v1 and v2 files", async () => {
  expect(
    await decodeTorrentFile(
      torrent(v1Info({ length: 0, pieces: new Uint8Array() })),
    ),
  ).toMatchObject({ length: 0, lastPieceLength: 0, pieces: [] });
  expect(
    await decodeTorrentFile(
      v2Torrent({ "file tree": dict({ empty: leaf(0) }) }),
    ),
  ).toMatchObject({
    version: "v2",
    length: 0,
    lastPieceLength: 0,
    files: [{ path: "empty", length: 0 }],
  });
});

it("parses pure v2 file trees without prepending the advisory name", async () => {
  const parsed = await decodeTorrentFile(
    v2Torrent({
      "file tree": dict({ root: dict({ a: leaf(1), b: leaf(2), c: leaf(0) }) }),
    }),
  );
  expect(parsed.version).toBe("v2");
  expect(parsed.infoHash).toBeUndefined();
  expect(parsed.infoHashV2).toBe(
    sha("sha256", parsed.infoBuffer).toString("hex"),
  );
  expect(parsed.files.map(({ path, offset }) => [path, offset])).toEqual([
    ["root/a", 0],
    ["root/b", 16384],
    ["root/c", 16386],
  ]);
  expect(parsed.length).toBe(3);
  expect(parsed.lastPieceLength).toBe(2);
});

it.each([16384, 32768])(
  "validates piece layers and Merkle padding at piece length %i",
  async (pieceLength) => {
    const hashes = [1, 2, 3].map((byte) => Buffer.alloc(32, byte));
    const zero = Buffer.alloc(32);
    const padding =
      pieceLength === 16384 ? zero : sha("sha256", Buffer.concat([zero, zero]));
    const root = sha(
      "sha256",
      Buffer.concat([
        sha("sha256", Buffer.concat(hashes.slice(0, 2))),
        sha("sha256", Buffer.concat([hashes[2], padding])),
      ]),
    );
    const layer = Buffer.concat(hashes);
    const fields = {
      "piece length": pieceLength,
      "file tree": dict({ large: leaf(pieceLength * 2 + 1, root) }),
    };
    const outer = {
      "piece layers": { entries: [{ key: root, value: layer }] },
    };
    const parsed = await decodeTorrentFile(v2Torrent(fields, outer));
    expect(parsed.pieceLayers?.get(root.toString("hex"))).toEqual(
      new Uint8Array(layer),
    );
    expect(await decodeTorrentFile(encodeTorrentFile(parsed.metainfo))).toEqual(
      parsed,
    );
    const corrupt = new Uint8Array(layer);
    corrupt[0] ^= 1;
    await expect(
      decodeTorrentFile(
        v2Torrent(fields, {
          "piece layers": { entries: [{ key: root, value: corrupt }] },
        }),
      ),
    ).rejects.toThrow("does not match");
    await expect(decodeTorrentFile(v2Torrent(fields))).rejects.toThrow(
      "missing",
    );
  },
);

it("keeps hybrid padding entries and aria2-compatible file indices", async () => {
  const info = v2Info({
    name: text("root"),
    pieces: new Uint8Array(40),
    files: [
      dict({ length: 1, path: [text("a")] }),
      dict({
        length: 16383,
        path: [text(".pad"), text("16383")],
        attr: text("p"),
      }),
      dict({ length: 2, path: [text("b")] }),
    ],
    "file tree": dict({ a: leaf(1), b: leaf(2) }),
  });
  const parsed = await decodeTorrentFile(
    torrent(info, { "piece layers": dict({}) }),
  );
  expect(parsed).toMatchObject({
    version: "hybrid",
    infoHash: sha("sha1", parsed.infoBuffer).toString("hex"),
    infoHashV2: sha("sha256", parsed.infoBuffer).toString("hex"),
    length: 16386,
  });
  expect(
    parsed.files.map(({ path, offset, padding }) => [path, offset, padding]),
  ).toEqual([
    ["root/a", 0, undefined],
    ["root/.pad/16383", 1, true],
    ["root/b", 16384, undefined],
  ]);
  expect(await decodeTorrentFile(encodeTorrentFile(parsed.metainfo))).toEqual(
    parsed,
  );
});

it("accepts aligned hybrid layouts with empty files between data files", async () => {
  const info = v2Info({
    name: text("root"),
    pieces: new Uint8Array(40),
    files: [
      dict({ length: 1, path: [text("a")] }),
      dict({
        length: 16383,
        path: [text(".pad"), text("16383")],
        attr: text("p"),
      }),
      dict({ length: 0, path: [text("empty")] }),
      dict({ length: 1, path: [text("last")] }),
    ],
    "file tree": dict({ a: leaf(1), empty: leaf(0), last: leaf(1) }),
  });
  expect(
    await decodeTorrentFile(torrent(info, { "piece layers": dict({}) })),
  ).toMatchObject({
    version: "hybrid",
    files: [
      { offset: 0 },
      { offset: 1, padding: true },
      { offset: 16384, length: 0 },
      { offset: 16384 },
    ],
  });
});

it("rejects mismatched hybrid layouts and invalid padding", async () => {
  const hybrid = (length: number, path: string) =>
    v2Torrent({
      name: text("root"),
      pieces: new Uint8Array(20),
      files: [dict({ length, path: [text(path)] })],
      "file tree": dict({ a: leaf(1) }),
    });
  await expect(decodeTorrentFile(hybrid(2, "a"))).rejects.toThrow("hybrid");
  await expect(decodeTorrentFile(hybrid(1, "b"))).rejects.toThrow("hybrid");
  await expect(
    decodeTorrentFile(
      v2Torrent({ pieces: new Uint8Array(20), length: 1, name: text("a") }),
    ),
  ).resolves.toMatchObject({ version: "hybrid" });
});

it.each([
  "",
  "d4:info",
  "d4:infoi01ee",
  "d4:infoi-0ee",
  "d4:infoi1e4:infoi2ee",
  "d1:bi1e1:ai2ee",
  "d04:infoi1ee",
  "d4:info999999999999999999999:xe",
  "d4:infodeejunk",
])("rejects malformed or noncanonical bencode %s", async (value) => {
  await expect(decodeTorrentFile(text(value))).rejects.toThrow(Error);
});

it.each(["..", ".", "a/b", "a\\b", "a\0b", "C:drive", ""])(
  "rejects unsafe file components %s",
  async (name) => {
    await expect(
      decodeTorrentFile(torrent(v1Info({ name: text(name) }))),
    ).rejects.toThrow("path");
    await expect(
      decodeTorrentFile(v2Torrent({ "file tree": dict({ [name]: leaf(1) }) })),
    ).rejects.toThrow(Error);
  },
);

it("rejects invalid fields, piece counts, unsafe integers and future versions", async () => {
  const invalidV1: Record<string, BencodeValue>[] = [
    { length: -1 },
    { length: 9007199254740992n },
    { "piece length": 0 },
    { pieces: new Uint8Array(19) },
    { files: [], length: 1 },
    { "meta version": 3 },
  ];
  for (const fields of invalidV1) {
    await expect(decodeTorrentFile(torrent(v1Info(fields)))).rejects.toThrow(
      Error,
    );
  }
  const invalidV2: Record<string, BencodeValue>[] = [
    { "piece length": 8192 },
    { "piece length": 32769 },
    { "piece length": 2 ** 52 - 1 },
    { "file tree": dict({}) },
    { "file tree": leaf(1) },
    { "file tree": dict({ a: leaf(1, new Uint8Array(31)) }) },
  ];
  for (const fields of invalidV2) {
    await expect(decodeTorrentFile(v2Torrent(fields))).rejects.toThrow(Error);
  }
  await expect(decodeTorrentFile(torrent(v2Info()))).rejects.toThrow(
    "piece layers",
  );
  const duplicate: BencodeDictionary = {
    entries: [
      { key: text("info"), value: v1Info() },
      { key: text("info"), value: v1Info() },
    ],
  };
  expect(() => encodeTorrentFile(duplicate)).toThrow("key");
});

it("fails clearly when Web Crypto is unavailable", async () => {
  const original = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    value: undefined,
    configurable: true,
  });
  try {
    await expect(decodeTorrentFile(torrent(v1Info()))).rejects.toThrow(
      "Web Crypto",
    );
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      value: original,
      configurable: true,
    });
  }
});
