import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",
  entry: {
    popup: { src: "popup.tsx", html: true },
    background: { src: "background.ts", html: false },
  },
  plugins: [pluginReact()],
  rsbuild: {
    html: { title: "Motrix Companion" },
    server: { port: 2542, strictPort: true },
  },
});
