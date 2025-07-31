import { MAX_BT_TRACKER_LENGTH } from "@/constant/speed";
import {
  convertCommaToLine,
  convertLineToComma,
  convertTrackerDataToComma,
  convertTrackerDataToLine,
  fetchBtTrackerFromSource,
  reduceTrackerString,
} from "@/utils/tracker";

describe("utils for tracker", () => {
  it("convertTrackerDataToLine", () => {
    const arr = [
      `udp://retracker01-msk-virt.corbina.net:80/announce

udp://public.tracker.vraphim.com:6969/announce

`,
      `https://tracker.zhuqiy.top:443/announce

https://tracker1.520.jp:443/announce`,
    ];
    const result = convertTrackerDataToLine(arr);

    expect(result).toBe(`udp://retracker01-msk-virt.corbina.net:80/announce
udp://public.tracker.vraphim.com:6969/announce
https://tracker.zhuqiy.top:443/announce
https://tracker1.520.jp:443/announce`);
  });

  it("convertTrackerDataToComma", () => {
    const arr = ["1", "2", "3"];
    const result = convertTrackerDataToComma(arr);
    expect(result).toBe("1,2,3");
  });

  it("reduceTrackerString", () => {
    const str = "1234567890";
    const result = reduceTrackerString(str);
    expect(result).toBe("1234567890");

    const longStr = "1234567890".repeat(100000);
    const longResult = reduceTrackerString(longStr);
    expect(longResult.length).toBe(MAX_BT_TRACKER_LENGTH);
    expect(longResult).toBe(longStr.slice(0, MAX_BT_TRACKER_LENGTH));
  });

  it("convertLineToComma", () => {
    const str = "1\n2\n3\n4";
    const result = convertLineToComma(str);
    expect(result).toBe("1,2,3,4");

    const returnStr = "1\r\n2\r\n3\r\n4";
    const returnResult = convertLineToComma(returnStr);
    expect(returnResult).toBe("1,2,3,4");
  });

  it("convertCommaToLine", () => {
    const str = "1,2,3,4";
    const result = convertCommaToLine(str);
    expect(result).toBe("1\n2\n3\n4");
  });

  it.skip("fetchBtTrackerFromSource", async () => {
    const mockData = "";
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(mockData),
    };

    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockResponse as Response);

    const result = await fetchBtTrackerFromSource([
      "http://test",
      "http://test2",
    ]);

    expect(result).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("http://test");

    fetchSpy.mockRestore();
  });
});
