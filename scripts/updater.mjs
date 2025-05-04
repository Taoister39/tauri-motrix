// @ts-check
import { context, getOctokit } from "@actions/github";
import process from "process";

import { resolveUpdateLog } from "./update_log.mjs";
import { getSignature } from "./utils.mjs";

// Add stable update JSON filenames
const UPDATE_TAG_NAME = "updater";
const UPDATE_JSON_FILE = "update.json";

const ALPHA_TAG_NAME = "updater-alpha";
const ALPHA_UPDATE_JSON_FILE = "update.json";

/**
 * @typedef {import("@actions/github")["context"]} Context
 * @typedef {Context["repo"]["repo"]} Repo
 * @typedef {Context["repo"]["owner"]} Owner
 * @typedef {{name: string;commit: {sha: string;url: string;};zipball_url: string;tarball_url: string;node_id: string;}} Tag
 */

async function resolveUpdater() {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error("GITHUB_TOKEN is required");
  }

  const options = { owner: context.repo.owner, repo: context.repo.repo };
  const github = getOctokit(process.env.GITHUB_TOKEN);

  let page = 1;
  const perPage = 100;

  /**
   * @type {Tag[]}
   */
  let allTags = [];

  while (true) {
    const { data: pageTags } = await github.rest.repos.listTags({
      ...options,
      per_page: perPage,
      page,
    });

    allTags = allTags.concat(pageTags);

    // Break if we received fewer tags than requested (last page)
    if (pageTags.length < perPage) {
      break;
    }

    page++;
  }

  const tags = allTags;
  console.log(`Retrieved ${tags.length} tags in total`);

  // More flexible tag detection with regex patterns
  const stableTagRegex = /^v\d+\.\d+\.\d+$/; // Matches vX.Y.Z format
  // const preReleaseRegex = /^v\d+\.\d+\.\d+-(alpha|beta|rc|pre)/i; // Matches vX.Y.Z-alpha/beta/rc format
  const preReleaseRegex = /^(alpha|beta|rc|pre)$/i; // Matches exact alpha/beta/rc/pre tags

  // Get the latest stable tag and pre-release tag
  const stableTag = tags.find((t) => stableTagRegex.test(t.name));
  const preReleaseTag = tags.find((t) => preReleaseRegex.test(t.name));

  console.log("All tags:", tags.map((t) => t.name).join(", "));
  console.log("Stable tag:", stableTag ? stableTag.name : "None found");
  console.log(
    "Pre-release tag:",
    preReleaseTag ? preReleaseTag.name : "None found",
  );
  console.log();

  // Process stable release
  if (stableTag) {
    await processRelease(github, options, stableTag, false);
  }

  // Process pre-release if found
  if (preReleaseTag) {
    await processRelease(github, options, preReleaseTag, true);
  }
}
/**
 *
 * @param {ReturnType<import("@actions/github")["getOctokit"]>} github
 * @param {{owner:Owner;repo:Repo}} options
 * @param {Tag | void} tag
 * @param {boolean} isAlpha
 */
async function processRelease(github, options, tag, isAlpha) {
  if (!tag) {
    return;
  }

  try {
    const { data: release } = await github.rest.repos.getReleaseByTag({
      ...options,
      tag: tag.name,
    });

    const updateData = {
      name: tag.name,
      notes: await resolveUpdateLog(tag.name).catch(
        () => "No changelog available",
      ),
      pub_date: new Date().toISOString(),
      platforms: {
        "windows-aarch64": { signature: "", url: "" },
        "windows-x86_64": { signature: "", url: "" },
      },
    };

    const promises = release.assets.map(async (asset) => {
      const { name, browser_download_url } = asset;

      // Process all the platform URL and signature data
      // win64 url
      if (name.endsWith("x64-setup.exe")) {
        updateData.platforms["windows-x86_64"].url = browser_download_url;
      }
      // win64 signature
      if (name.endsWith("x64-setup.exe.sig")) {
        const sig = await getSignature(browser_download_url);
        updateData.platforms["windows-x86_64"].signature = sig;
      }

      // win arm url
      if (name.endsWith("arm64-setup.exe")) {
        updateData.platforms["windows-aarch64"].url = browser_download_url;
      }
      // win arm signature
      if (name.endsWith("arm64-setup.exe.sig")) {
        const sig = await getSignature(browser_download_url);
        updateData.platforms["windows-aarch64"].signature = sig;
      }
    });

    await Promise.allSettled(promises);
    console.log(updateData);

    // maybe should test the signature as well
    // delete the null field
    Object.entries(updateData.platforms).forEach(([key, value]) => {
      if (!value.url) {
        console.log(`[Error]: failed to parse release for "${key}"`);
        delete updateData.platforms[key];
      }
    });

    // Get the appropriate updater release based on isAlpha flag
    const releaseTag = isAlpha ? ALPHA_TAG_NAME : UPDATE_TAG_NAME;
    console.log(
      `Processing ${isAlpha ? "alpha" : "stable"} release:`,
      releaseTag,
    );

    // Try to get the existing release
    const updateRelease = await github.rest.repos
      .getReleaseByTag({
        ...options,
        tag: releaseTag,
      })
      .then(
        ({ data }) => {
          console.log(
            `Found existing ${releaseTag} release with ID: ${data.id}`,
          );
          return data;
        },
        async (err) => {
          if (err.status === 404) {
            console.log(
              `Release with tag ${releaseTag} not found, creating new release...`,
            );
            const createResponse = await github.rest.repos.createRelease({
              ...options,
              tag_name: releaseTag,
              name: isAlpha
                ? "Auto-update Alpha Channel"
                : "Auto-update Stable Channel",
              body: `This release contains the update information for ${isAlpha ? "alpha" : "stable"} channel.`,
              prerelease: isAlpha,
            });
            console.log(
              `Created new ${releaseTag} release with ID: ${updateRelease.id}`,
            );
            return createResponse.data;
          }
          return Promise.reject(err);
        },
      );

    // File names based on release type
    const jsonFile = isAlpha ? ALPHA_UPDATE_JSON_FILE : UPDATE_JSON_FILE;

    // Delete existing assets with these names
    for (let asset of updateRelease.assets) {
      if (asset.name === jsonFile) {
        await github.rest.repos.deleteReleaseAsset({
          ...options,
          asset_id: asset.id,
        });
      }
    }

    // Upload new assets
    await github.rest.repos
      .uploadReleaseAsset({
        ...options,
        release_id: updateRelease.id,
        name: jsonFile,
        data: JSON.stringify(updateData, null, 2),
      })
      .catch((error) => {
        console.error(
          `Failed to process ${isAlpha ? "alpha" : "stable"} release:`,
          error.message,
        );
      });

    console.log(
      `Successfully uploaded ${isAlpha ? "alpha" : "stable"} update files to ${releaseTag}`,
    );
  } catch (error) {
    if (error.status === 404) {
      console.log(`Release not found for tag: ${tag.name}, skipping...`);
    } else {
      console.error(
        `Failed to get release for tag: ${tag.name}`,
        error.message,
      );
    }
  }
}

resolveUpdater().catch(console.error);
