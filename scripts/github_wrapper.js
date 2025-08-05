import { context, getOctokit } from "@actions/github";
import process from "process";

/**

 * @typedef {object} Tag
 * @property {string} name
 * @property {object} commit
 * @property {string} commit.sha
 * @property {string} commit.url
 * @property {string} zipball_url
 * @property {string} tarball_url
 * @property {string} node_id
 */

/**
 * @returns {Promise<Tag[]>}
 */
export async function getAllTags() {
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

  return allTags;
}
