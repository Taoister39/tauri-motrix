import type { Meta, StoryObj } from "storybook-react-rsbuild";

import Copyright from "../src/base/Copyright";

const meta = {
  title: "Base/Copyright",
  component: Copyright,
} satisfies Meta<typeof Copyright>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Simple: Story = {};

export const Italic: Story = {
  args: {
    component: "i",
  },
};
