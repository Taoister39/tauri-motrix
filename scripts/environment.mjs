import { execSync } from "child_process";
import path from "path";
import process from "process";

export const { cwd: cwdFn, argv, platform: _platform, arch: _arch } = process;

const PLATFORM_MAP = {
  "x86_64-pc-windows-msvc": "win32",
  "i686-pc-windows-msvc": "win32",
  "aarch64-pc-windows-msvc": "win32",
  "x86_64-apple-darwin": "darwin",
  "aarch64-apple-darwin": "darwin",
  "x86_64-unknown-linux-gnu": "linux",
  "i686-unknown-linux-gnu": "linux",
  "aarch64-unknown-linux-gnu": "linux",
  "armv7-unknown-linux-gnueabihf": "linux",
  "riscv64gc-unknown-linux-gnu": "linux",
  "loongarch64-unknown-linux-gnu": "linux",
};
const ARCH_MAP = {
  "x86_64-pc-windows-msvc": "x64",
  "i686-pc-windows-msvc": "ia32",
  "aarch64-pc-windows-msvc": "arm64",
  "x86_64-apple-darwin": "x64",
  "aarch64-apple-darwin": "arm64",
  "x86_64-unknown-linux-gnu": "x64",
  "i686-unknown-linux-gnu": "ia32",
  "aarch64-unknown-linux-gnu": "arm64",
  "armv7-unknown-linux-gnueabihf": "arm",
  "riscv64gc-unknown-linux-gnu": "riscv64",
  "loongarch64-unknown-linux-gnu": "loong64",
};

// ci/cd environment argument
// why the splice start to 2?
// because nodejs process.argv[0] is nodejs path, and argv[1] is script path
const _target = argv.slice(2)[0];

export const platform = _target ? PLATFORM_MAP[_target] : _platform;
export const arch = _target ? ARCH_MAP[_target] : _arch;

export const cwd = cwdFn();

export const isWin = platform === "win32";
export const isMac = platform === "darwin";

/**
 * Special directory to store temporary files for tauri-motrix
 */
export const TEMP_DIR = path.join(cwd, "node_modules/.tauri-motrix");

export const SIDECAR_HOST = _target
  ? _target
  : execSync("rustc -vV")
      .toString()
      .match(/(?<=host: ).+(?=\s*)/g)[0];

export const TARGET_KEY = `${platform}-${arch}`;
