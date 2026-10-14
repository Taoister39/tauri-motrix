import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { Checkbox } from "../dist/components";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: { label: "Notify when complete" },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Basic: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};
export const Error: Story = { args: { error: "Confirm this option" } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Checkbox size={size} key={size} label={size} />
      ))}
    </div>
  ),
};
