import { buildAtom } from "@/utils/build_atom";
describe("buildAtom", () => {
  it("should return the correct atom object", () => {
    const index = 2;
    const bitfield = "1234567890abcdef";
    const offset = 10;
    const atomWG = 10;
    const atomHG = 10;
    const columnCount = 2;

    const expectedResult = {
      id: "3",
      status: 0,
      x: 0,
      y: 20,
    };

    const result = buildAtom(
      index,
      bitfield,
      offset,
      atomWG,
      atomHG,
      columnCount,
    );
    expect(result).toEqual(expectedResult);
  });
});
