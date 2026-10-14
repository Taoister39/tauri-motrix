import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { Button, IconButton } from "../dist/components";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Save" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Button size={size} key={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};
export const Icon: Story = {
  render: () => <IconButton aria-label="Refresh">↺</IconButton>,
};
