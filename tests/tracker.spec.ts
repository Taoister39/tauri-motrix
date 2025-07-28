import {
  convertTrackerDataToComma,
  convertTrackerDataToLine,
} from "@/utils/tracker";

describe("utils for tracker", () => {
  it("convertTrackerDataToLine", () => {
    const arr = ["1", "2", "3"];
    const result = convertTrackerDataToLine(arr);

    expect(result).toBe("1\n2\n3");
  });

  it("convertTrackerDataToComma", () => {
    const arr = ["1", "2", "3"];
    const result = convertTrackerDataToComma(arr);
    expect(result).toBe("1,2,3");
  });
});
