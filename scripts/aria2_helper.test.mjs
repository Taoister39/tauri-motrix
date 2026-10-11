import assert from "node:assert/strict";
import { test } from "node:test";

import { createAria2BinInfo } from "./aria2_helper.mjs";

for (const tag of ["aria2c-release-1.37.0", "aria2c-release-1.37.0-m1"]) {
  test(`resolves the archive version and full release tag for ${tag}`, () => {
    const info = createAria2BinInfo(tag);

    assert.match(info.zipFile, /^aria2-1\.37\.0-.+\.zip$/);
    assert.ok(info.downloadURL.endsWith(`/${tag}/${info.zipFile}`));
  });
}

test("rejects release tags without an aria2 version", () => {
  assert.throws(() => createAria2BinInfo("aria2c-release-m1"), {
    message: "Invalid aria2 release tag: aria2c-release-m1",
  });
});
