import type { Config } from "jest";
import { join } from "path";

// const __dirname = dirname(fileURLToPath(import.meta.url));

const config: Config = {
  projects: [
    {
      testEnvironment: "jest-environment-jsdom",
      globals: {
        OS_PLATFORM: process.platform,
      },
      setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
      displayName: "common-platform",
      testMatch: [
        "<rootDir>/tests/**/*.(spec|test).(tsx|ts)",
        "<rootDir>/packages/aria2/tests/**/*.(spec|test).(tsx|ts)",
        "<rootDir>/packages/unified-base/tests/**/*.(spec|test).(tsx|ts)",
        // "<rootDir>/packages/torrent/tests/**/*.(spec|test).(tsx|ts)",
      ],
      transform: {
        "^.+\\.(t|j)sx?$": [
          "@swc/jest",
          {
            jsc: {
              parser: {
                tsx: true,
                syntax: "typescript",
              },
              transform: {
                react: {
                  runtime: "automatic",
                },
              },
            },
            isModule: "unknown",
          },
        ],
      },
      transformIgnorePatterns: ["node_modules/(?!.*react-error-boundary.*)"],
      moduleNameMapper: {
        "^@root/(.*)$": "<rootDir>/$1",
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.svg\\?react$": "<rootDir>/tests/__mocks__/svgr_mock.js",
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
          "<rootDir>/tests/__mocks__/file_mock.js",
        "\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/style_mock.js",
        // TODO: I don't know why it's not found.
        "^@tauri-motrix/aria2/mocks$":
          "<rootDir>/node_modules/@tauri-motrix/aria2/dist/mocks.js",
        "^@tauri-motrix/aria2$":
          "<rootDir>/node_modules/@tauri-motrix/aria2/dist/index.js",
      },
    },
    {
      testEnvironment: "jest-environment-jsdom",
      setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
      displayName: "ux-base",
      testMatch: ["<rootDir>/packages/ux-base/tests/*.(spec|test).(ts|tsx)"],
      transform: {
        "^.+\\.(ts|tsx|js|jsx|mjs|cjs|html)$": [
          "jest-chain-transform",
          {
            transformers: [
              [
                "@stylexswc/jest",
                {
                  rsOptions: {
                    aliases: {
                      "@/*": [join(__dirname, "*")],
                    },
                    unstable_moduleResolution: {
                      type: "commonJS",
                    },
                  },
                },
              ],
              [
                "@swc/jest",
                {
                  $schema: "https://json.schemastore.org/swcrc",
                  jsc: {
                    parser: {
                      syntax: "typescript",
                      tsx: true,
                      dynamicImport: true,
                      decorators: true,
                      dts: true,
                    },
                    transform: {
                      react: {
                        useBuiltins: true,
                        runtime: "automatic",
                      },
                    },
                    target: "esnext",
                    loose: false,
                    externalHelpers: false,
                    keepClassNames: true,
                    baseUrl: "./",
                    paths: {
                      "@/*": ["./*"],
                    },
                  },
                  module: {
                    type: "es6",
                  },
                  minify: false,
                },
              ],
            ],
          },
        ],
      },
    },
  ],
};

export default config;
