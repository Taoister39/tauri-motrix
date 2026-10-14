import "../dist/styles.css";

import type { Preview } from "storybook-react-rsbuild";

import { UxTheme } from "../dist/theme";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Scoped theme",
      toolbar: { icon: "circlehollow", items: ["light", "dark", "system"] },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <UxTheme
        mode={context.globals.theme}
        style={{ padding: 24, background: "Canvas" }}
      >
        <Story />
      </UxTheme>
    ),
  ],
};
export default preview;
