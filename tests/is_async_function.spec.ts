import isAsyncFunction from "@/utils/is_async_function";
describe("isAsyncFunction", () => {
  it("should return true for async functions", () => {
    const asyncFunc = async () => {};
    expect(isAsyncFunction(asyncFunc)).toBe(true);
  });

  it("should return false for regular functions", () => {
    function regularFunc() {}
    expect(isAsyncFunction(regularFunc)).toBe(false);
  });

  it("should return false for arrow functions", () => {
    const arrowFunc = () => {};
    expect(isAsyncFunction(arrowFunc)).toBe(false);
  });

  it("should return false for class methods", () => {
    class MyClass {}
    // @ts-expect-error type boundary
    expect(isAsyncFunction(MyClass)).toBe(false);
  });

  it("should return false for non-function inputs", () => {
    expect(() => {
      // @ts-expect-error type boundary
      isAsyncFunction(undefined);
    }).toThrow("Cannot read properties of undefined");

    expect(() => {
      // @ts-expect-error type boundary
      isAsyncFunction(null);
    }).toThrow("Cannot read properties of null");

    // @ts-expect-error type boundary
    expect(isAsyncFunction(123)).toBe(false);
    // @ts-expect-error type boundary
    expect(isAsyncFunction("string")).toBe(false);
    // @ts-expect-error type boundary
    expect(isAsyncFunction({})).toBe(false);
  });
});
