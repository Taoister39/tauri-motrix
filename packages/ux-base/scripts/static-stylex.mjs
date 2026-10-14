import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import stylexBabelPlugin from "@stylexjs/babel-plugin";
import { normalizeRsOptions, transform } from "@stylexswc/rs-compiler";

import { generateTokens } from "./generate-tokens.mjs";

/**
 * @type {import("@stylexswc/unplugin").UnpluginStylexRSOptions["rsOptions"]}
 */
export const stylexOptions = {
  dev: false,
  treeshakeCompensation: true,
  runtimeInjection: false,
  unstable_moduleResolution: { type: "commonJS" },
};

async function collectRules(directory, options) {
  const rules = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) rules.push(...(await collectRules(file, options)));
    else if (/\.[jt]sx?$/.test(file) && !file.endsWith(".d.ts")) {
      const source = await readFile(file, "utf8");
      if (source.includes("@stylexjs/stylex")) {
        rules.push(...(transform(file, source, options).metadata.stylex ?? []));
      }
    }
  }
  return rules;
}

/** Bundleless builds need a single extraction pass across all source modules. */
export function staticStylexPlugin() {
  const source = fileURLToPath(new URL("../src/", import.meta.url));
  return {
    apply(compiler) {
      compiler.hooks.beforeCompile.tapPromise(
        "ux-base-generate-tokens",
        generateTokens,
      );
      compiler.hooks.thisCompilation.tap(
        "ux-base-static-stylex",
        (compilation) => {
          compilation.hooks.processAssets.tapPromise(
            {
              name: "ux-base-static-stylex",
              stage:
                compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            },
            async () => {
              const rules = await collectRules(
                source,
                normalizeRsOptions(stylexOptions),
              );
              const css = stylexBabelPlugin.processStylexRules(rules, true);
              compilation.emitAsset(
                "styles.css",
                new compiler.webpack.sources.RawSource(css),
              );
            },
          );
        },
      );
    },
  };
}
