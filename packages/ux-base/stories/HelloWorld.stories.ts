import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { HelloWorld } from "../dist/index";

const meta = {
  title: "Template/HelloWorld",
  component: HelloWorld,
} satisfies Meta<typeof HelloWorld>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
