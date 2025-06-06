import {
  bitfieldToPercent,
  calcProgress,
  parseByte,
  parseByteVo,
  peerIdParser,
  toByte,
} from "@/utils/download";

describe("parseByteVo", () => {
  it("should return ['NaN', ''] for invalid input", () => {
    expect(parseByteVo(undefined)).toEqual(["NaN", ""]);
    expect(parseByteVo("invalid")).toEqual(["NaN", ""]);
  });

  it("should return correct value for bytes less than 1000", () => {
    expect(parseByteVo(500)).toEqual(["500", "B"]);
  });

  it("should return correct value for larger units", () => {
    expect(parseByteVo(1024)).toEqual(["1.00", "KB"]);
    expect(parseByteVo(1048576)).toEqual(["1.00", "MB"]);
    expect(parseByteVo(1073741824)).toEqual(["1.00", "GB"]);
  });

  it("should handle string input", () => {
    expect(parseByteVo("2048")).toEqual(["2.00", "KB"]);
  });

  it("should append suffix to units", () => {
    expect(parseByteVo(1024, "/s")).toEqual(["1.00", "KB/s"]);
  });
});

describe("toByte", () => {
  it("should return NaN for invalid input", () => {
    expect(toByte(undefined as unknown as number, "KB")).toBeNaN();
    expect(toByte("invalid", "KB")).toBeNaN();
    expect(toByte(100, "INVALID_UNIT" as unknown as "B")).toBeNaN();
  });

  it("should convert units to bytes correctly", () => {
    expect(toByte(1, "KB")).toBe(1024);
    expect(toByte(1, "MB")).toBe(1048576);
    expect(toByte(1, "GB")).toBe(1073741824);
  });

  it("should handle string input", () => {
    expect(toByte("2", "KB")).toBe(2048);
  });
});

describe("parseByte", () => {
  it("should return NaN for invalid input", () => {
    expect(parseByte(undefined as unknown as string, "KB")).toBeNaN();
    expect(parseByte("invalid", "KB")).toBeNaN();
    expect(parseByte(100, "INVALID_UNIT" as unknown as "B")).toBeNaN();
  });

  it("should convert bytes to units correctly", () => {
    expect(parseByte(1024, "KB")).toBe(1);
    expect(parseByte(1048576, "MB")).toBe(1);
    expect(parseByte(1073741824, "GB")).toBe(1);
  });

  it("should handle string input", () => {
    expect(parseByte("2048", "KB")).toBe(2);
  });
});

describe("calcProgress", () => {
  it("should return 100", () => {
    const percentage = calcProgress(1, 1, 1);
    expect(percentage).toBe(100);
  });
});

describe("peerIdParser", () => {
  it("should return UNKNOWN_PEER_ID_NAME if input is empty or UNKNOWN_PEER_ID", () => {
    expect(peerIdParser("")).toBe("unknown");
    expect(peerIdParser("UNKNOWN_PEER_ID")).toBe("unknown");
  });

  it("should parse peerId correctly", () => {
    const testPeerId = "%2DUT360W%2D%92%B6%EBh%1F%A1%DBfo%F6%D5I"; // Example peer ID
    const expected = "µTorrent v3.6.0 "; // Replace this with the expected parsed output
    expect(peerIdParser(testPeerId)).toBe(expected);
  });
});

describe("bitfieldToPercent", () => {
  test("should return 100 for a fully set bitfield", () => {
    const fullBitfield = "f".repeat(512); // Example full bitfield
    expect(bitfieldToPercent(fullBitfield)).toBe("100");
  });

  test("should return 0 for an empty bitfield", () => {
    expect(bitfieldToPercent("0".repeat(512))).toBe("0");
  });

  test("should handle small bitfields correctly", () => {
    expect(bitfieldToPercent("F")).toBe("100");
    expect(bitfieldToPercent("0")).toBe("0");
    expect(bitfieldToPercent("A")).toBe("50"); // Example mixed bitfield
  });

  test("should handle an empty string gracefully", () => {
    expect(bitfieldToPercent("")).toBe("NaN"); // Adjust based on function behavior
  });
});
