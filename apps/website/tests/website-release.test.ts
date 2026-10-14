import {
  classifyReleaseAssets,
  getLatestRelease,
  parseLatestRelease,
} from "../src/lib/release";
import release from "./fixtures/website-release-v0.2.5.json";

describe("Website release downloads", () => {
  it("shows all eight v0.2.5 installers and excludes updater files", () => {
    const parsed = parseLatestRelease(release);
    expect(parsed).not.toBeNull();
    const downloads = classifyReleaseAssets(parsed!.assets);
    expect(
      downloads.map(({ platform, architecture, format }) => [
        platform,
        architecture,
        format,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["windows", "x64", "exe"],
        ["windows", "arm64", "exe"],
        ["macos", "x64", "dmg"],
        ["macos", "arm64", "dmg"],
        ["linux", "x64", "deb"],
        ["linux", "arm64", "deb"],
        ["linux", "x64", "appimage"],
        ["linux", "arm64", "appimage"],
      ]),
    );
    expect(downloads).toHaveLength(8);
    expect(downloads.map(({ href }) => href)).toEqual(
      expect.arrayContaining([
        `${release.html_url.replace("/tag/", "/download/")}/Tauri.Motrix_0.2.5_x64-setup.exe`,
        `${release.html_url.replace("/tag/", "/download/")}/Tauri.Motrix_0.2.5_aarch64.dmg`,
        `${release.html_url.replace("/tag/", "/download/")}/Tauri.Motrix_0.2.5_amd64.AppImage`,
      ]),
    );
    for (const download of downloads) {
      expect(
        release.assets.map((asset) => asset.browser_download_url),
      ).toContain(download.href);
    }
  });

  it.each([
    ["x64", "x64"],
    ["amd64", "x64"],
    ["arm64", "arm64"],
    ["aarch64", "arm64"],
  ])("normalizes the %s architecture label", (assetArchitecture, expected) => {
    expect(
      classifyReleaseAssets([
        {
          name: `Tauri.Motrix_0.2.5_${assetArchitecture}.deb`,
          browser_download_url: "https://example.com/installer.deb",
        },
      ]),
    ).toEqual([expect.objectContaining({ architecture: expected })]);
  });

  it("keeps available downloads when another package is missing", () => {
    const assets = release.assets.filter(
      (asset) => asset.name !== "Tauri.Motrix_0.2.5_x64.dmg",
    );
    const parsed = parseLatestRelease({ ...release, assets });
    const downloads = classifyReleaseAssets(parsed!.assets);
    expect(downloads).toHaveLength(7);
    expect(downloads).not.toContainEqual(
      expect.objectContaining({
        platform: "macos",
        architecture: "x64",
      }),
    );
  });

  it("does not invent links for an empty release", () => {
    const parsed = parseLatestRelease({ ...release, assets: [] });
    expect(parsed).not.toBeNull();
    expect(classifyReleaseAssets(parsed!.assets)).toEqual([]);
  });

  it("ignores malformed assets and links outside the current GitHub release", () => {
    const parsed = parseLatestRelease({
      ...release,
      assets: [
        release.assets.find((asset) => asset.name.endsWith("x64-setup.exe")),
        null,
        { name: "Tauri.Motrix_0.2.5_x64.dmg" },
        {
          name: "Tauri.Motrix_0.2.5_arm64.deb",
          browser_download_url: "javascript:alert(1)",
        },
        {
          name: "Tauri.Motrix_0.2.5_amd64.deb",
          browser_download_url:
            "https://github.com/Taoister39/tauri-motrix/releases/download/v0.2.4/old.deb",
        },
      ],
    });
    expect(classifyReleaseAssets(parsed!.assets)).toHaveLength(1);
  });

  it.each([
    { name: "a missing response", value: null },
    { name: "an API error", value: { message: "API rate limit exceeded" } },
    {
      name: "a sidecar release",
      value: { ...release, tag_name: "aria2c-release-1.37.0" },
    },
    {
      name: "an invalid release date",
      value: { ...release, published_at: "not-a-date" },
    },
    {
      name: "an invalid release URL",
      value: { ...release, html_url: "javascript:alert(1)" },
    },
    { name: "an invalid asset list", value: { ...release, assets: null } },
  ])("rejects $name", ({ value }) => {
    expect(parseLatestRelease(value)).toBeNull();
  });
});

describe("Website release fetching", () => {
  it("loads validated release information with an hourly cache", async () => {
    const fetchRelease = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => release,
    });
    await expect(getLatestRelease(fetchRelease)).resolves.toEqual(release);
    expect(fetchRelease).toHaveBeenCalledWith(
      "https://api.github.com/repos/Taoister39/tauri-motrix/releases/latest",
      { next: { revalidate: 3600 } },
    );
  });

  it("returns unavailable on an HTTP error", async () => {
    const fetchRelease = jest.fn().mockResolvedValue({ ok: false });
    await expect(getLatestRelease(fetchRelease)).resolves.toBeNull();
  });

  it("returns unavailable when the network request fails", async () => {
    const fetchRelease = jest
      .fn()
      .mockRejectedValue(new Error("Connection failed"));
    await expect(getLatestRelease(fetchRelease)).resolves.toBeNull();
  });

  it("returns unavailable when the API sends an invalid response", async () => {
    const fetchRelease = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Unexpected response" }),
    });
    await expect(getLatestRelease(fetchRelease)).resolves.toBeNull();
  });

  it("returns unavailable when the response is not JSON", async () => {
    const fetchRelease = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Invalid JSON");
      },
    });
    await expect(getLatestRelease(fetchRelease)).resolves.toBeNull();
  });
});
