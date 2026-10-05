import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveUpdaterPlatforms } from "./updater_assets.mjs";

const asset = (name) => ({
  name,
  browser_download_url: `https://example.com/${name}`,
});

test("resolves signed updater bundles for all six release targets", async () => {
  const bundles = {
    "windows-x86_64": "Tauri.Motrix_0.2.4_x64-setup.exe",
    "windows-aarch64": "Tauri.Motrix_0.2.4_arm64-setup.exe",
    "darwin-x86_64": "Tauri.Motrix_x64.app.tar.gz",
    "darwin-aarch64": "Tauri.Motrix_aarch64.app.tar.gz",
    "linux-x86_64": "Tauri.Motrix_0.2.4_amd64.AppImage",
    "linux-aarch64": "Tauri.Motrix_0.2.4_aarch64.AppImage",
  };
  const assets = Object.values(bundles).flatMap((name) => [
    asset(`${name}.sig`),
    asset(name),
  ]);
  assets.push(
    asset("Tauri.Motrix_0.2.4_x64.dmg"),
    asset("Tauri.Motrix_0.2.4_arm64.deb"),
  );

  const platforms = await resolveUpdaterPlatforms(
    assets,
    async (url) => `signature:${url}`,
  );

  assert.deepEqual(
    platforms,
    Object.fromEntries(
      Object.entries(bundles).map(([platform, name]) => [
        platform,
        {
          url: asset(name).browser_download_url,
          signature: `signature:${asset(`${name}.sig`).browser_download_url}`,
        },
      ]),
    ),
  );
});

test("omits incomplete bundle and signature pairs", async () => {
  const platforms = await resolveUpdaterPlatforms(
    [
      asset("Tauri.Motrix_x64.app.tar.gz"),
      asset("Tauri.Motrix_0.2.4_aarch64.AppImage.sig"),
    ],
    async () => {
      throw new Error("No complete pair should require a signature download");
    },
  );

  assert.deepEqual(platforms, {});
});

test("rejects empty signatures", async () => {
  await assert.rejects(
    resolveUpdaterPlatforms(
      [
        asset("Tauri.Motrix_x64.app.tar.gz"),
        asset("Tauri.Motrix_x64.app.tar.gz.sig"),
      ],
      async () => " \n",
    ),
    /Empty updater signature for darwin-x86_64/,
  );
});
