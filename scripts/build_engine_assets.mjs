// @ts-check

/**
 * @param {ReturnType<import("@actions/github")["getOctokit"]>} github
 * @param {{owner: string, repo: string}} options
 * @param {{id: number, assets: {id: number, name: string}[]}} release
 * @param {string} fileName
 * @param {string} version
 */
export async function uploadBuildEngineVersion(
  github,
  options,
  release,
  fileName,
  version,
) {
  for (const asset of release.assets) {
    if (asset.name === fileName) {
      await github.rest.repos.deleteReleaseAsset({
        ...options,
        asset_id: asset.id,
      });
    }
  }

  return github.rest.repos.uploadReleaseAsset({
    ...options,
    release_id: release.id,
    name: fileName,
    data: version,
  });
}
