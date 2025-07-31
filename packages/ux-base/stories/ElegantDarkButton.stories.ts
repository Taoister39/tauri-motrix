import type { Meta, StoryObj } from "storybook-react-rsbuild";

import ElegantDarkButton from "../src/button/ElegantDarkButton";

const meta = {
  title: "Button/ElegantDarkButton",
  component: ElegantDarkButton,
} satisfies Meta<typeof ElegantDarkButton>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Basic: Story = {
  args: {
    children: "Button",
  },
};
