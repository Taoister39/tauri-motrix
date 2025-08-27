import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";
import stylexPlugin from "@stylexswc/unplugin/rspack";

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
          rsOptions: {
            dev: true,
            treeshakeCompensation: true,
            runtimeInjection: true,
          },
          useCSSLayers: true,
          extractCSS: false,
        }),
      ],
    },
  },
});
