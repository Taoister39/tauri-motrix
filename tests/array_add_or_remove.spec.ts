import { arrayAddOrRemove } from "@/utils/array_add_or_remove";
describe("arrayAddOrRemove", () => {
  it("should add or remove value from array", () => {
    const array = [1, 2, 3];

    const result = arrayAddOrRemove(array, 2);
    expect(result).toEqual([1, 3]);

    const result2 = arrayAddOrRemove(result, 4);
    expect(result2).toEqual([1, 3, 4]);
  });
});
