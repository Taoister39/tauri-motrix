import { Instance } from "parse-torrent";

import {
  AUDIO_SUFFIXES,
  DOCUMENT_SUFFIXES,
  IMAGE_SUFFIXES,
  SUB_SUFFIXES,
  VIDEO_SUFFIXES,
} from "@/constant/file";

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

export type FileWithFullName = { name: string; extension?: string };

export const filterVideoFiles = <T extends FileWithFullName>(
  files: T[] = [],
) => {
  const suffix = [...VIDEO_SUFFIXES, ...SUB_SUFFIXES];
  return files.filter((item) => {
    return suffix.includes(item.extension ?? `.${getFileExtension(item.name)}`);
  });
};

export const isVideoFile = (filename: string) =>
  !!filterVideoFiles([{ name: filename }])[0];

export const filterAudioFiles = <T extends FileWithFullName>(files: T[] = []) =>
  files.filter((item) => {
    return AUDIO_SUFFIXES.includes(
      item.extension ?? `.${getFileExtension(item.name)}`,
    );
  });

export const isAudioFile = (filename: string) =>
  !!filterAudioFiles([{ name: filename }])[0];

export const filterImageFiles = <T extends FileWithFullName>(files: T[] = []) =>
  files.filter((item) => {
    return IMAGE_SUFFIXES.includes(
      item.extension ?? `.${getFileExtension(item.name)}`,
    );
  });

export const isImageFile = (filename: string) =>
  !!filterImageFiles([{ name: filename }])[0];

export const filterDocumentFiles = <T extends FileWithFullName>(
  files: T[] = [],
) =>
  files.filter((item) => {
    return DOCUMENT_SUFFIXES.includes(
      item.extension ?? `.${getFileExtension(item.name)}`,
    );
  });

export const isDocumentFile = (filename: string) =>
  !!filterDocumentFiles([{ name: filename }])[0];

export const getAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL

      const { result } = reader;

      // TODO: consider the boundary situation
      if (typeof result === "string") {
        const noBase64Prefix = result.split("base64,")[1];
        resolve(noBase64Prefix);
      } else {
        reject(result);
      }
    });
    reader.readAsDataURL(file);
  });
