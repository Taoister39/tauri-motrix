import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: ["./src/**"],
    },
  },
  lib: [
    {
      format: "esm",
      syntax: ["node 18"],
      dts: true,
      bundle: false,
    },
  ],
});
