import assert from "node:assert/strict";
import { test } from "node:test";

import { uploadBuildEngineVersion } from "./build_engine_assets.mjs";

const options = { owner: "owner", repo: "repo" };
const fileName = "aria2c_latest_version.txt";
const version = "aria2c-release-1.37.0-m1";

function createGithub(failingOperation) {
  const calls = [];
  const github = {
    rest: {
      repos: Object.fromEntries(
        ["deleteReleaseAsset", "uploadReleaseAsset"].map((operation) => [
          operation,
          async (params) => {
            calls.push({ operation, params });
            if (operation === failingOperation) {
              throw new Error(`${operation} failed`);
            }
          },
        ]),
      ),
    },
  };
  return { github, calls };
}

const upload = {
  operation: "uploadReleaseAsset",
  params: { ...options, release_id: 1, name: fileName, data: version },
};

test("uploads a version file when no matching asset exists", async () => {
  const { github, calls } = createGithub();
  await uploadBuildEngineVersion(
    github,
    options,
    { id: 1, assets: [{ id: 2, name: "other.txt" }] },
    fileName,
    version,
  );
  assert.deepEqual(calls, [upload]);
});

test("replaces the matching version asset and preserves other assets", async () => {
  const { github, calls } = createGithub();
  await uploadBuildEngineVersion(
    github,
    options,
    {
      id: 1,
      assets: [
        { id: 2, name: "other.txt" },
        { id: 3, name: fileName },
      ],
    },
    fileName,
    version,
  );
  assert.deepEqual(calls, [
    { operation: "deleteReleaseAsset", params: { ...options, asset_id: 3 } },
    upload,
  ]);
});

for (const operation of ["deleteReleaseAsset", "uploadReleaseAsset"]) {
  test(`propagates ${operation} failures`, async () => {
    const { github, calls } = createGithub(operation);
    await assert.rejects(
      uploadBuildEngineVersion(
        github,
        options,
        { id: 1, assets: [{ id: 3, name: fileName }] },
        fileName,
        version,
      ),
      { message: `${operation} failed` },
    );
    if (operation === "deleteReleaseAsset") {
      assert.equal(calls.length, 1);
    }
  });
}
