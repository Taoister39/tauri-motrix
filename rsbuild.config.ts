import { defineConfig } from "@rsbuild/core";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSvgr } from "@rsbuild/plugin-svgr";
import path from "path";
import process from "process";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [pluginNodePolyfill(), pluginReact(), pluginSvgr()],
  source: {
    define: {
      OS_PLATFORM: `"${process.platform}"`,
    },
  },
  server: {
    port: 2539,
    strictPort: true,
    host,
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      "@root": path.resolve("./"),
    },
  },
  dev: {
    client: host
      ? {
          protocol: "ws",
          host,
          port: 2540,
        }
      : undefined,
  },
  tools: {
    rspack: {
      watchOptions: {
        ignored: ["**/src-tauri/**"],
      },
    },
  },
});
