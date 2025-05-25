import { Instance } from "parse-torrent";

export const listTorrentFiles = (files: Instance["files"]) => {
  const result = files?.map((file, index) => {
    const extension = getFileExtension(file.path);
    const item = {
      // aria2 select-file start index at 1
      // possible Values: 1-1048576
      idx: index + 1,
      extension: `.${extension}`,
      ...file,
    };
    return item;
  });
  return result;
};

export const getFileName = (fullPath: string) => {
  return fullPath.replace(/^.*[\\/]/, "");
};

export const getFileExtension = (filename: string) => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};
