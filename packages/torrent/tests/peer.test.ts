import { parsePeerId } from "@tauri-motrix/torrent";

import fixtures from "./peer-id-fixtures.json";

it("preserves the upstream client registry and implemented version formats", () => {
  for (const { input, expected } of fixtures) {
    expect({ input, parsed: parsePeerId(input) }).toEqual({
      input,
      parsed: expected,
    });
  }
});

it("parses percent-encoded binary peer IDs without requiring UTF-8", () => {
  expect(parsePeerId("%2DUT360W%2D%92%B6%EBh%1F%A1%DBfo%F6%D5I")).toEqual({
    client: "µTorrent",
    version: "3.6.0",
  });
  const raw = "-qB1234-xxxxxxxxxxxx";
  expect(parsePeerId(Buffer.from(raw).toString("hex"))).toEqual(
    parsePeerId(new TextEncoder().encode(raw)),
  );
});

it.each(["", "x".repeat(19), "x".repeat(21), "%XX", "%u1234", "f".repeat(39)])(
  "rejects invalid peer ID input %s",
  (input) => {
    expect(() => parsePeerId(input)).toThrow(Error);
  },
);

it("handles binary special clients, spoofing and unknown IDs", () => {
  const spirit = new Uint8Array(20);
  spirit.set([0, 0, 66, 83]);
  expect(parsePeerId(spirit)).toEqual({ client: "BitSpirit", version: "1" });
  const comet = new TextEncoder().encode("exbc\u0001\u0002xxxxxxxxxxxxxx");
  expect(parsePeerId(comet)).toEqual({ client: "BitComet", version: "1.02" });
  expect(parsePeerId("xxxxxxxxxxxxxxxxUDP0")).toEqual({ client: "BitSpirit?" });
  expect(parsePeerId("-ZT1234-bLAdexxxxxxx")).toEqual({
    client: "Unknown [Fake: ZipTorrent]",
    version: "1.2.3.4",
  });
  const snark = new Uint8Array(20);
  snark.set([3, 3, 3], 9);
  expect(parsePeerId(snark)).toEqual({ client: "I2PSnark" });
  const shareaza = Uint8Array.from({ length: 20 }, (_, i) =>
    i < 16 ? i + 1 : (i - 15) ^ (32 - i),
  );
  expect(parsePeerId(shareaza)).toEqual({ client: "Shareaza" });
  expect(parsePeerId("xxxxxxxxxxxxxxxxxxxx")).toEqual({ client: "unknown" });
});
