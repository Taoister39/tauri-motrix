import type { StorybookConfig } from "storybook-react-rsbuild";

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: ["storybook-addon-rslib"],
  framework: "storybook-react-rsbuild", // storybook-react-rsbuild for example
};
export default config;
