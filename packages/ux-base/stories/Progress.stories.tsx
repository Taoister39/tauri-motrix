import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { Progress } from "../dist/components";

const meta = {
  title: "Components/Progress",
  component: Progress,
  args: { label: "Download progress", value: 35, showValue: true },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Basic: Story = {};
export const Unknown: Story = { args: { value: undefined } };
export const Failed: Story = { args: { status: "error" } };
export const Complete: Story = { args: { value: 100, status: "success" } };
