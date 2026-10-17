import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import AdmZip from "adm-zip";

const extensionRoot = fileURLToPath(
  new URL("../apps/extensions/", import.meta.url),
);
const output = path.join(extensionRoot, ".addfox/extension/extension-chromium");
const manifest = JSON.parse(
  await readFile(path.join(output, "manifest.json"), "utf8"),
);
const sourceManifest = JSON.parse(
  await readFile(path.join(extensionRoot, "src/manifest.json"), "utf8"),
);

function outputPath(url, parent = "index.html") {
  const resolved = new URL(url, new URL(parent, "https://extension.invalid/"));
  assert.equal(resolved.origin, "https://extension.invalid");
  return path.join(output, decodeURIComponent(resolved.pathname));
}

test("production manifest preserves permissions and points to generated entries", async () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, sourceManifest.name);
  assert.equal(manifest.version, sourceManifest.version);
  for (const field of [
    "permissions",
    "host_permissions",
    "optional_host_permissions",
  ]) {
    assert.deepEqual(manifest[field], sourceManifest[field]);
  }
  assert.equal(typeof manifest.action.default_popup, "string");
  assert.equal(typeof manifest.background.service_worker, "string");
  await readFile(outputPath(manifest.action.default_popup));
  await readFile(outputPath(manifest.background.service_worker));
  assert.equal(manifest.content_security_policy, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
});

test("popup references local scripts, styles, fonts, and courier artwork", async () => {
  const popup = manifest.action.default_popup;
  const html = await readFile(outputPath(popup), "utf8");
  assert.match(html, /<div id="root"><\/div>/);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
  const styles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)];
  assert.ok(scripts.length > 0);
  assert.ok(styles.length > 0);
  for (const [, src] of scripts) {
    assert.notEqual(src.replace(/^\//, ""), manifest.background.service_worker);
    const code = await readFile(outputPath(src, popup), "utf8");
    assert.doesNotMatch(code, /eval\s*\(|new Function\s*\(/);
  }
  const bundledScripts = await Promise.all(
    scripts.map(([, src]) => readFile(outputPath(src, popup), "utf8")),
  );
  const artwork = bundledScripts
    .join("\n")
    .match(/src:\s*["']([^"']*orbit-courier\.webp)["']/);
  assert.ok(artwork, "The hero artwork must remain in the popup bundle");
  await readFile(outputPath(artwork[1], popup));
  let fonts = 0;
  for (const [, href] of styles) {
    const cssPath = outputPath(href, popup);
    const css = await readFile(cssPath, "utf8");
    for (const [, url] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (url.startsWith("data:")) continue;
      await readFile(
        outputPath(url, path.relative(output, cssPath).replaceAll("\\", "/")),
      );
      if (/\.ttf$/.test(url)) fonts++;
    }
  }
  assert.equal(fonts, 4);
});

test("production worker registers browser listeners without a DOM or popup runtime", async () => {
  const registered = new Map();
  function event(name) {
    return {
      addListener: (...args) => registered.set(name, args),
    };
  }
  const chrome = {
    runtime: { onMessage: event("message") },
    webRequest: { onHeadersReceived: event("headers") },
    tabs: { onRemoved: event("closed"), onUpdated: event("navigation") },
    permissions: { onRemoved: event("permission") },
    downloads: { onCreated: event("download") },
  };
  const code = await readFile(
    outputPath(manifest.background.service_worker),
    "utf8",
  );
  runInNewContext(code, { chrome }, { timeout: 1000 });
  assert.deepEqual([...registered.keys()].sort(), [
    "closed",
    "download",
    "headers",
    "message",
    "navigation",
    "permission",
  ]);
  const [onMessage] = registered.get("message");
  assert.equal(
    onMessage({ type: "snapshot" }, { id: "other" }, () => {}),
    false,
  );
});

test("distribution ZIP matches the production manifest and includes its entries", async () => {
  const zip = new AdmZip(`${output}.zip`);
  assert.deepEqual(JSON.parse(zip.readAsText("manifest.json")), manifest);
  for (const entry of [
    manifest.action.default_popup,
    manifest.background.service_worker,
    "assets/orbit-courier.webp",
  ]) {
    assert.ok(zip.getEntry(entry), `${entry} is missing from the ZIP`);
  }
  assert.ok(
    zip.getEntries().every((entry) => !entry.entryName.endsWith(".map")),
  );
});
