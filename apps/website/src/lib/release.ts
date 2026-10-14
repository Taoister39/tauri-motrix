import { LATEST_RELEASE, URL_FOR_RELEASE } from "../constants/release";

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface LatestRelease {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

export type Platform = "windows" | "macos" | "linux";
export type Architecture = "x64" | "arm64";
export type PackageFormat = "exe" | "dmg" | "deb" | "appimage";

export interface Download {
  platform: Platform;
  architecture: Architecture;
  format: PackageFormat;
  href: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseLatestRelease(value: unknown): LatestRelease | null {
  if (
    !isRecord(value) ||
    typeof value.tag_name !== "string" ||
    !/^v\d+\.\d+\.\d+$/.test(value.tag_name) ||
    typeof value.published_at !== "string" ||
    !Number.isFinite(Date.parse(value.published_at)) ||
    value.html_url !== `${URL_FOR_RELEASE}/tag/${value.tag_name}` ||
    !Array.isArray(value.assets)
  ) {
    return null;
  }

  const assets: ReleaseAsset[] = [];
  for (const asset of value.assets) {
    if (
      isRecord(asset) &&
      typeof asset.name === "string" &&
      typeof asset.browser_download_url === "string" &&
      asset.browser_download_url.startsWith(
        `${URL_FOR_RELEASE}/download/${value.tag_name}/`,
      )
    ) {
      assets.push({
        name: asset.name,
        browser_download_url: asset.browser_download_url,
      });
    }
  }

  return {
    tag_name: value.tag_name,
    published_at: value.published_at,
    html_url: value.html_url,
    assets,
  };
}

export async function getLatestRelease(
  fetchRelease: typeof fetch = fetch,
): Promise<LatestRelease | null> {
  try {
    const response = await fetchRelease(LATEST_RELEASE, {
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return parseLatestRelease(value);
  } catch {
    return null;
  }
}

export function classifyReleaseAssets(assets: ReleaseAsset[]): Download[] {
  const downloads: Download[] = [];

  for (const asset of assets) {
    const match =
      /^Tauri[ .]Motrix_[^_]+_(x64|amd64|arm64|aarch64)(-setup\.exe|\.dmg|\.deb|\.AppImage)$/.exec(
        asset.name,
      );
    if (!match) continue;

    const architecture: Architecture =
      match[1] === "x64" || match[1] === "amd64" ? "x64" : "arm64";
    const suffix = match[2];
    const format: PackageFormat =
      suffix === "-setup.exe"
        ? "exe"
        : suffix === ".dmg"
          ? "dmg"
          : suffix === ".deb"
            ? "deb"
            : "appimage";
    const platform: Platform =
      format === "exe" ? "windows" : format === "dmg" ? "macos" : "linux";

    downloads.push({
      platform,
      architecture,
      format,
      href: asset.browser_download_url,
    });
  }

  return downloads;
}
