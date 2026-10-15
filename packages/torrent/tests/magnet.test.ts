import { encodeMagnet, parseMagnet, parseTorrent } from "@tauri-motrix/torrent";

const v1 = "0123456789abcdef0123456789abcdef01234567";
const v2 = "ab".repeat(32);

it("normalizes hexadecimal, base32 and binary hashes", async () => {
  for (const input of [
    "a".repeat(40),
    "VKVKVKVKVKVKVKVKVKVKVKVKVKVKVKVK",
    new Uint8Array(20).fill(170),
  ]) {
    expect(await parseTorrent(input)).toMatchObject({
      kind: "identifier",
      version: "v1",
      infoHash: "a".repeat(40),
    });
  }
  expect(await parseTorrent(v2.toUpperCase())).toMatchObject({
    version: "v2",
    infoHashV2: v2,
  });
  expect(await parseTorrent(new Uint8Array(32).fill(171))).toMatchObject({
    version: "v2",
    infoHashV2: v2,
  });
});

it("round-trips hybrid magnets, repeated extensions, sources and selections", () => {
  const uri = `stream-magnet:?xt=urn:btih:${v1}&xt=urn:btmh:1220${v2}&dn=A%2BB+file&tr=https%3A%2F%2Ft.test%2Fa&tr=https%3A%2F%2Ft.test%2Fa&ws=https%3A%2F%2Fw.test&as=https%3A%2F%2Fs.test&xs=https%3A%2F%2Fx.test&xs=urn:btpk:${v2}&x.pe=%5B%3A%3A1%5D%3A6881&kt=one+two&so=0,2,4-6&x.extra=first&x.extra=second`;
  const parsed = parseMagnet(uri);
  expect(parsed).toMatchObject({
    version: "hybrid",
    infoHash: v1,
    infoHashV2: v2,
    name: "A+B file",
    announce: ["https://t.test/a"],
    urlList: ["https://s.test", "https://w.test"],
    peerAddresses: ["[::1]:6881"],
    keywords: ["one", "two"],
    selectOnly: [0, 2, 4, 5, 6],
    publicKey: v2,
    parameters: { "x.extra": ["first", "second"] },
  });
  expect(parseMagnet(encodeMagnet(parsed))).toMatchObject({
    ...parsed,
    parameters: expect.objectContaining({
      "x.extra": ["first", "second"],
      xs: ["https://x.test", `urn:btpk:${v2}`],
    }),
  });
});

it("encodes normalized fields without changing the input", async () => {
  const input = {
    infoHash: v1.toUpperCase(),
    announce: ["a", "a"],
    selectOnly: [6, 4, 5, 0, 0],
    parameters: { custom: ["a=b+c"], dn: ["old"] },
    name: "new+name",
  };
  const saved = structuredClone(input);
  const uri = encodeMagnet(input);
  expect(parseMagnet(uri)).toMatchObject({
    name: "new+name",
    selectOnly: [0, 4, 5, 6],
    parameters: { custom: ["a=b+c"] },
  });
  expect(input).toEqual(saved);
  expect(await parseTorrent(input)).toMatchObject({
    version: "v1",
    infoHash: v1,
  });
});

it("preserves keyword phrases, literal plus signs and escaped extension topics", () => {
  const input = {
    infoHash: v1,
    keywords: ["a phrase", "a+b"],
    parameters: { xt: ["urn:custom:a&tr=unexpected"] },
  };
  const parsed = parseMagnet(encodeMagnet(input));
  expect(parsed.keywords).toEqual(input.keywords);
  expect(parsed.announce).toEqual([]);
  expect(parsed.parameters.xt).toContain("urn:custom:a&tr=unexpected");
});

it.each([
  "https://example.test/file.torrent",
  "magnet:?xt=urn:sha1:abc",
  "magnet:?xt=urn:btih:bad",
  `magnet:?xt=urn:btih:${v1}&xt=urn:btih:${"f".repeat(40)}`,
  `magnet:?xt=urn:btmh:1120${v2}`,
  `magnet:?xt=urn:btih:${v1}&so=6-2`,
  `magnet:?xt=urn:btih:${v1}&so=0-999999999999`,
  `magnet:?xt=urn:btih:${v1}&dn=%XX`,
])("rejects invalid magnet input %s", (uri) =>
  expect(() => parseMagnet(uri)).toThrow(Error),
);
