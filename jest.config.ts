import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
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
  moduleNameMapper: {
    "\\.svg\\?react$": "<rootDir>/tests/__mocks__/svgr_mock.js",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/tests/__mocks__/file_mock.js",
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/style_mock.js",
    "^@root/(.*)$": "<rootDir>/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    // TODO: I don't know why it's not found.
    "^@tauri-motrix/aria2/mocks$":
      "<rootDir>/node_modules/@tauri-motrix/aria2/dist/mocks.js",
    "^@tauri-motrix/aria2$":
      "<rootDir>/node_modules/@tauri-motrix/aria2/dist/index.js",
  },
  watchPathIgnorePatterns: ["<rootDir>/src-tauri/"],
};

export default config;
