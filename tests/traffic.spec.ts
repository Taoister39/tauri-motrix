import { getTrafficGraphY } from "@/utils/traffic";

describe("getTrafficGraphY", () => {
  it("keeps zero traffic at the baseline, including an idle graph", () => {
    expect(getTrafficGraphY(0, 0, 112)).toBe(111);
    expect(getTrafficGraphY(0, 100 * 1024 ** 2, 112)).toBe(111);
  });

  it("shows proportional changes above 10 MB/s with room above the peak", () => {
    const peak = 100 * 1024 ** 2;

    expect(getTrafficGraphY(20 * 1024 ** 2, peak, 112)).toBeCloseTo(91);
    expect(getTrafficGraphY(50 * 1024 ** 2, peak, 112)).toBeCloseTo(61);
    expect(getTrafficGraphY(peak, peak, 112)).toBeCloseTo(11);
  });

  it("uses a minimum scale for low traffic", () => {
    expect(getTrafficGraphY(512, 512, 112)).toBeCloseTo(61);
  });
});
