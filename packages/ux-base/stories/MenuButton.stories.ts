import type { Meta, StoryObj } from "storybook-react-rsbuild";

import MenuButton from "../src/button/MenuButton";

const meta = {
  title: "Button/MenuButton",
  component: MenuButton,
} satisfies Meta<typeof MenuButton>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Basic: Story = {
  args: {
    open: false,
    onClick() {
      console.log("click for Basic");
    },
  },
};
