export const convertTrackerDataToLine = (arr: string[] | undefined = []) => {
  if (!arr) {
    return "";
  }
  const result = arr.join("\n").trim();
  return result;
};

export const convertTrackerDataToComma = (arr: string[] | undefined = []) => {
  const result = convertTrackerDataToLine(arr)
    .replace(/(?:\r\n|\r|\n)/g, ",")
    .trim();
  return result;
};
