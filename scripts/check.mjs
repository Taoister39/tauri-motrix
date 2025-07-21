// @ts-check
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { extract } from "tar";
import zlib from "zlib";

import { createAria2BinInfo, getLatestAria2Tag } from "./aria2_helper.mjs";
import { cwd, TEMP_DIR } from "./environment.mjs";
import {
  baseExecutableMove,
  baseMove,
  downloadFile,
  log_debug,
  log_error,
  log_success,
  pullUpOnlySubDirectory,
} from "./utils.mjs";

async function resolveSidecar(binInfo) {
  const { name, targetFile, zipFile, exeFile, downloadURL } = binInfo;

  const sidecarDir = path.join(cwd, "src-tauri", "sidecar");
  const sidecarPath = path.join(sidecarDir, targetFile);

  await fsp.mkdir(sidecarDir, { recursive: true });

  const tempDir = path.join(TEMP_DIR, name);
  const tempZip = path.join(tempDir, zipFile);
  const tempExe = path.join(tempDir, exeFile);

  await fsp.mkdir(tempDir, { recursive: true });
  try {
    if (!fs.existsSync(tempZip)) {
      await downloadFile(downloadURL, tempZip);
    }

    if (zipFile.endsWith(".zip")) {
      // sometimes occur type error in new AdmZip() or AdmZip();
      const zip = new AdmZip(tempZip);
      zip.getEntries().forEach((entry) => {
        log_debug(`"${name}" entry name`, entry.entryName);
      });
      zip.extractAllTo(tempDir, true);

      await fsp.rm(tempZip);
      await pullUpOnlySubDirectory(tempDir);

      await baseMove(tempExe, sidecarPath);

      log_success(`unzip finished: "${name}"`);
    } else if (zipFile.endsWith(".tgz")) {
      // tgz
      await fsp.mkdir(tempDir, { recursive: true });
      await extract({
        cwd: tempDir,
        file: tempZip,
      });
      const files = await fsp.readdir(tempDir);
      log_debug(`"${name}" files in tempDir:`, files);
      const extractedFile = files.find((item) => item.startsWith("aria2c"));
      if (extractedFile) {
        const extractedFilePath = path.join(tempDir, extractedFile);
        await baseExecutableMove(extractedFilePath, sidecarPath);
      } else {
        throw new Error(`Expected file not found in ${tempDir}`);
      }
    } else if (zipFile.endsWith(".dmg")) {
      // dmg - macOS executable file
      await baseExecutableMove(tempZip, sidecarPath);
    } else {
      // gz
      const readStream = fs.createReadStream(tempZip);
      const writeStream = fs.createWriteStream(sidecarPath);
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          log_error(`"${name}" gz failed:`, error.message);
          reject(error);
        };
        readStream
          .pipe(zlib.createGunzip().on("error", onError))
          .pipe(writeStream)
          .on("finish", () => {
            execSync(`chmod 755 ${sidecarPath}`);
            log_success(`chmod binary finished: "${name}"`);
            resolve(1);
          })
          .on("error", onError);
      });
    }
  } catch (err) {
    // Need to delete the file
    await fsp.rm(sidecarPath, { recursive: true, force: true });
    throw err;
  } finally {
    // delete temp dir
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}
/**
 * Download aria2 from Github Release page and save to sidecar
 */

async function resolveAria2() {
  const latestTag = await getLatestAria2Tag();

  const binInfo = createAria2BinInfo(latestTag);

  resolveSidecar(binInfo);
}

/**
 * Ensure locales file to Rust process using.
 */
async function resolveLocales() {
  const srcLocalesDir = path.join(cwd, "src/locales");
  const targetLocalesDir = path.join(cwd, "src-tauri/resources/locales");

  try {
    // ensure locales dir exists
    await fsp.mkdir(targetLocalesDir, { recursive: true });

    const files = await fsp.readdir(srcLocalesDir);

    // copy all locale files
    for (const file of files) {
      const srcPath = path.join(srcLocalesDir, file);
      const targetPath = path.join(targetLocalesDir, file);

      await fsp.copyFile(srcPath, targetPath);
      log_success(`Copied locale file: ${file}`);
    }

    log_success("All locale files copied successfully");
  } catch (err) {
    log_error("Error copying locale files:", err?.message ?? err);
    throw err;
  }
}

/**
 * @type { Array<{ name: string, func: Function, retry: number}> }
 */
const tasks = [
  {
    name: "aria2",
    func: resolveAria2,
    retry: 5,
  },
  {
    name: "locales",
    func: resolveLocales,
    retry: 2,
  },
];

async function runTask() {
  const task = tasks.shift();
  if (!task) return;

  for (let i = 0; i < task.retry; i++) {
    try {
      await task.func();
      break;
    } catch (err) {
      log_error(`task::${task.name} try ${i} ==`, err.message);
      if (i === task.retry - 1) throw err;
    }
  }
  return runTask();
}

runTask();
