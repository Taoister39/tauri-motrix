// @ts-check
import fs from "fs";
import path from "path";
import process from "process";

function validateVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
}

function getVersion({ input, currentVersion }) {
  console.log("Received: " + input);

  if (
    ["patch", "minor", "major"].includes(input) &&
    validateVersion(currentVersion)
  ) {
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    switch (input) {
      case "patch":
        return `${major}.${minor}.${patch + 1}`;
      case "minor":
        return `${major}.${minor + 1}.0`;
      case "major":
        return `${major + 1}.0.0`;
    }
  }

  if (validateVersion(input)) {
    return input;
  }

  throw new Error(
    "Invalid version type. Please specify 'patch', 'minor', or 'major'. Or provide a valid version number (e.g., 1.2.3).",
  );
}

function run() {
  if (process.argv.length < 3) {
    throw new Error("Please provide a new version");
  }

  const tauriPath = path.resolve("src-tauri", "tauri.conf.json");
  const tauriConfigString = fs.readFileSync(tauriPath, "utf-8");
  const tauriConfig = JSON.parse(tauriConfigString);

  const newVersion = getVersion({
    input: process.argv[2],
    currentVersion: tauriConfig.version,
  });

  // update tauri.conf.json
  const updateTauriConfig = tauriConfigString.replace(
    /"version"\s*:\s*".*"/,
    `"version": "${newVersion}"`,
  );
  fs.writeFileSync(tauriPath, updateTauriConfig);

  // update Cargo.toml
  let cargoToml = fs.readFileSync("src-tauri/Cargo.toml", "utf-8");
  cargoToml = cargoToml.replace(
    /version\s*=\s*".*"/,
    `version = "${newVersion}"`,
  );
  fs.writeFileSync("src-tauri/Cargo.toml", cargoToml);

  let packageJson = fs.readFileSync("package.json", "utf-8");
  packageJson = packageJson.replace(
    /"version"\s*:\s*".*"/,
    `"version": "${newVersion}"`,
  );
  fs.writeFileSync("package.json", packageJson);

  console.log(
    `Version updated to ${newVersion} in tauri.conf.json, Cargo.toml, and package.json`,
  );
}

run();
