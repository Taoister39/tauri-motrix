import { MAX_BT_TRACKER_LENGTH } from "@/constant/speed";

export const convertTrackerDataToLine = (arr: string[] = []) => {
  const result = arr
    .join("\r\n")
    .replace(/^\s*[\r\n]/gm, "")
    .trim();
  return result;
};

export const convertTrackerDataToComma = (arr: string[] = []) => {
  const result = convertTrackerDataToLine(arr)
    .replace(/(?:\r\n|\r|\n)/g, ",")
    .trim();
  return result;
};

export const reduceTrackerString = (str = "") => {
  if (str.length <= MAX_BT_TRACKER_LENGTH) {
    return str;
  }

  const subStr = str.substring(0, MAX_BT_TRACKER_LENGTH);
  const index = subStr.lastIndexOf(",");
  if (index === -1) {
    return subStr;
  }

  const result = subStr.substring(0, index);
  return result;
};

export const convertLineToComma = (text = "") => {
  const result = text.trim().replace(/(?:\r\n|\r|\n)/g, ",");
  return result;
};

export const convertCommaToLine = (text = "") => {
  text = `${text}`;
  let arr = text.split(",");
  arr = arr.map((row) => row.trim());
  const result = arr.join("\n").trim();
  return result;
};

export const fetchBtTrackerFromSource = async (
  syncRemotes: string[],
  now = Date.now(),
) => {
  const promises = syncRemotes.map((url) => {
    return fetch(`${url}?t=${now}`).then((res) => res.text());
  });
  const res = await Promise.all(promises);
  return res;
};

export const syncTrackerFromSourceHelper = async (
  syncRemotes: string[],
  now?: number,
) => {
  const res = await fetchBtTrackerFromSource(syncRemotes, now);
  return convertTrackerDataToLine(res);
};
