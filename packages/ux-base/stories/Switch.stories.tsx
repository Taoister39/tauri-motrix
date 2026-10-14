import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { Switch } from "../dist/components";

const meta = {
  title: "Components/Switch",
  component: Switch,
  args: { label: "Resume tasks automatically" },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Basic: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = {
  args: { error: "This option cannot be changed right now" },
};
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Switch size={size} key={size} label={size} />
      ))}
    </div>
  ),
};
