// @ts-check
import { getOctokit } from "@actions/github";
import { context } from "@actions/github";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import process from "process";

import { cwd } from "./environment.mjs";
import { getAllTags } from "./github_wrapper.js";
import { log_error, log_success } from "./utils.mjs";

const BUILD_ENGINE_TAG = "build-engine";
/**
 * why did use extra version file?
 * because build custom engine is intrinsic version
 * so we need to use extra version or tag file to fetch executable file
 */
const BUILD_ENGINE = "build_engine.json";

const FILE_MAP = {
  aria2c: "aria2c_latest_version.txt",
};

async function resolveVersionTag() {
  const file = path.join(cwd, "docs", BUILD_ENGINE);

  if (!fs.existsSync(file)) {
    throw new Error("could not found UPDATELOG.md");
  }

  const raw = await fsp.readFile(file, "utf-8");
  /**
   * @type {Record<string, string>}
   */
  const data = JSON.parse(raw);

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value !== "string") {
      throw new Error(`Invalid value type for key ${key}`);
    }
  });

  return data;
}

async function resolveBuildEngineVersion() {
  const tags = await getAllTags();
  console.log(`Retrieved ${tags.length} tags in total`);
  log_success("All tags:", tags.map((t) => t.name).join(", "));

  const tagMap = await resolveVersionTag();

  // ---- specific engine version ----
  for (const key in tagMap) {
    const tag = tags.find((t) => t.name === tagMap[key]);

    if (!tag) {
      throw new Error(`${key} tag not found`);
    } else {
      log_success(`${key} tag: ${tag.name}`);
    }
  }

  releaseBuildEngine(tagMap);
}
/**
 *
 * @param {Record<string, string>} tagMap
 */
async function releaseBuildEngine(tagMap) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error("GITHUB_TOKEN is required");
  }

  const github = getOctokit(process.env.GITHUB_TOKEN);
  const options = { owner: context.repo.owner, repo: context.repo.repo };

  const updateRelease = await github.rest.repos
    .getReleaseByTag({
      ...options,
      tag: BUILD_ENGINE_TAG,
    })
    .then(
      ({ data }) => data,
      async (error) => {
        if (error.status === 404) {
          const release = await github.rest.repos.createRelease({
            ...options,
            tag_name: BUILD_ENGINE_TAG,
            name: BUILD_ENGINE_TAG,
            body: "Build engine version",
            draft: false,
            prerelease: false,
          });
          return release.data;
        } else {
          throw error;
        }
      },
    );

  for (const [engine, version] of Object.entries(tagMap)) {
    const fileName = FILE_MAP[engine];

    if (!fileName) {
      throw new Error(`Invalid engine: ${engine}`);
    }

    await uploadBuildEngineVersion(
      github,
      options,
      updateRelease.id,
      fileName,
      version,
    );
  }
}

/**
 * @typedef {import("@actions/github")["context"]} Context
 * @typedef {Context["repo"]["repo"]} Repo
 * @typedef {Context["repo"]["owner"]} Owner
 *
 * @param {ReturnType<import("@actions/github")["getOctokit"]>} github
 * @param {{owner:Owner;repo:Repo}} options
 * @param {number} release_id
 * @param {string} engine
 * @param {string} version
 * @returns
 */

function uploadBuildEngineVersion(
  github,
  options,
  release_id,
  engine,
  version,
) {
  return github.rest.repos
    .uploadReleaseAsset({
      ...options,
      release_id,
      name: engine,
      data: version,
    })
    .catch((error) => {
      log_error(`Failed to update engine version: ${error.message}`);
    });
}

resolveBuildEngineVersion().catch(console.error);
