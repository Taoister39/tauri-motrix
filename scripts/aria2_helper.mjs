import process from "process";

import { isWin, SIDECAR_HOST, TARGET_KEY } from "./environment.mjs";
import { createFetchOptionsFactory, log_error, log_info } from "./utils.mjs";

// There is no arm64 version in official repository at latest.
// The official aria2 release version also is unsupported 128 threads.
// It's recommended to switch to the community repo.

const ARIA2_URL_PREFIX =
  "https://github.com/Taoister39/aria2-windows-arm64/releases/download";

const ARIA2_REPO_TAG_API_URL =
  "https://api.github.com/repos/Taoister39/aria2-windows-arm64/tags";

const ARIA2_MAP = {
  "win32-x64": "win-64bit-build1",
  "win32-arm64": "win-arm64bit-build1",
  "darwin-arm64":"osx-darwin",
  // TODO
  // "aarch64-unknown-linux-gnu": "aarch64-linux-android-build1",
};

// ensure aria2 task
if (!ARIA2_MAP[TARGET_KEY]) {
  throw new Error(`Unsupported platform or architecture: ${TARGET_KEY}`);
}

/**
 *  Get the latest tag by GitHub api
 */
export async function getLatestAria2Tag() {
  const options = createFetchOptionsFactory();

  try {
    const tagListRes = await fetch(ARIA2_REPO_TAG_API_URL, {
      ...options,
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
      },
    }).then((res) => res.json());

    const latestTag = tagListRes[0];

    const tag = latestTag?.name;
    // release-x.xx.x
    if (tag) {
      log_info(`Latest release tag: ${tag}`);

      return tag;
    } else {
      throw new Error("Invalid latest tag object.");
    }
  } catch (err) {
    log_error("Error fetching latest tag:", err.message);
    process.exit(1);
  }
}

/**
 *
 * @param {string} latestTag
 * @returns
 */
export function createAria2BinInfo(latestTag) {
  const name = ARIA2_MAP[TARGET_KEY];

  const urlExt = "zip";
  const [, version] = latestTag.split("-");

  const downloadName = `aria2-${version}-${name}`;

  const downloadURL = `${ARIA2_URL_PREFIX}/${latestTag}/${downloadName}.${urlExt}`;

  const exeFile = `aria2c${isWin ? ".exe" : ""}`;
  const zipFile = `${downloadName}.${urlExt}`;

  return {
    name: "aria2c",
    targetFile: `aria2c-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile,
    zipFile,
    downloadURL,
  };
}
