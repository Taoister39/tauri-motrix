import { parseByte, parseByteVo, toByte } from "@/utils/download";

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
