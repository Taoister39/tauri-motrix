import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: { entry: { popup: "./src/popup.tsx" } },
  html: { title: "Motrix UI verification" },
  output: { distPath: { root: "unpacked" }, assetPrefix: "./" },
});
