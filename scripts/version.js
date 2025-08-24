// @ts-check
import fs from "fs";
import path from "path";
import process from "process";

const newVersion = process.env.NEW_VERSION; // for example CI or Changesets hook

// update tauri.conf.json
const tauriPath = path.resolve("src-tauri", "tauri.conf.json");
const tauriConfig = JSON.parse(fs.readFileSync(tauriPath, "utf-8"));
tauriConfig.package.version = newVersion;
fs.writeFileSync(tauriPath, JSON.stringify(tauriConfig, null, 2) + "\n");

// update Cargo.toml
let cargoToml = fs.readFileSync("src-tauri/Cargo.toml", "utf-8");
cargoToml = cargoToml.replace(
  /version\s*=\s*".*"/,
  `version = "${newVersion}"`,
);
fs.writeFileSync("src-tauri/Cargo.toml", cargoToml);

console.log(
  `Version updated to ${newVersion} in tauri.conf.json and Cargo.toml`,
);
