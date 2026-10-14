import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";
import stylexPlugin from "@stylexswc/unplugin/rspack";

import { generateTokens } from "./scripts/generate-tokens.mjs";
import { staticStylexPlugin, stylexOptions } from "./scripts/static-stylex.mjs";

await generateTokens();

export default defineConfig({
  source: {
    entry: {
      index: ["./src/**"],
    },
  },
  lib: [
    {
      bundle: false,
      dts: true,
      format: "esm",
    },
  ],
  output: {
    target: "web",
  },
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [
        stylexPlugin({
          rsOptions: stylexOptions,
          useCSSLayers: true,
          extractCSS: false,
        }),
        staticStylexPlugin(),
      ],
    },
  },
});
