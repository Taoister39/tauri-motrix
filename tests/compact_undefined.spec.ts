import { compactUndefined } from "@/utils/compact_undefined";

describe("compactUndefined", () => {
  it("should remove undefined properties from an object", () => {
    const input = { a: 1, b: undefined, c: "test" };
    const expected = { a: 1, c: "test" };
    expect(compactUndefined(input)).toEqual(expected);
  });

  it("should return the same object if no properties are undefined", () => {
    const input = { a: 1, b: 2, c: "test" };
    expect(compactUndefined(input)).toEqual(input);
  });

  it("should return an empty object if all properties are undefined", () => {
    const input = { a: undefined, b: undefined };
    expect(compactUndefined(input)).toEqual({});
  });

  it("should handle nested objects", () => {
    const input = { a: { b: undefined }, c: "test" };
    const expected = { a: {}, c: "test" };
    expect(compactUndefined(input)).toEqual(expected);
  });
});
