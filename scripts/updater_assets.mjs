// @ts-check

const PLATFORM_ASSETS = {
  "windows-x86_64": /x64-setup\.exe$/,
  "windows-aarch64": /arm64-setup\.exe$/,
  "darwin-x86_64": /_(x64|x86_64)\.app\.tar\.gz$/,
  "darwin-aarch64": /_(aarch64|arm64)\.app\.tar\.gz$/,
  "linux-x86_64": /_(amd64|x86_64)\.AppImage$/,
  "linux-aarch64": /_(aarch64|arm64)\.AppImage$/,
};

/**
 * @typedef {Record<string, {url: string; signature: string}>} UpdaterPlatforms
 */

/**
 * Match updater bundles with their signatures, excluding installer-only assets.
 * @param {{name: string; browser_download_url: string}[]} assets
 * @param {(url: string) => Promise<string>} getSignature
 * @returns {Promise<UpdaterPlatforms>}
 */
export async function resolveUpdaterPlatforms(assets, getSignature) {
  /**
   * @type {UpdaterPlatforms}
   */
  const platforms = {};

  await Promise.all(
    Object.entries(PLATFORM_ASSETS).map(async ([platform, pattern]) => {
      const bundle = assets.find((asset) => pattern.test(asset.name));
      if (!bundle) return;

      const signatureAsset = assets.find(
        (asset) => asset.name === `${bundle.name}.sig`,
      );
      if (!signatureAsset) return;

      const signature = await getSignature(signatureAsset.browser_download_url);
      if (!signature.trim()) {
        throw new Error(`Empty updater signature for ${platform}`);
      }

      platforms[platform] = {
        url: bundle.browser_download_url,
        signature,
      };
    }),
  );

  return platforms;
}
