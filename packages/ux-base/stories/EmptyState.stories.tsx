import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { Button, EmptyState } from "../dist/components";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: { text: "No downloads yet", icon: "↓" },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Basic: Story = {};
export const WithAction: Story = {
  args: { action: <Button>Add task</Button> },
};
