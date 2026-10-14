import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { TextField } from "../dist/components";

const meta = {
  title: "Components/TextField",
  component: TextField,
  args: { label: "Resource name", helpText: "Enter a name" },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Basic: Story = {};
export const Error: Story = { args: { error: "Enter a resource name" } };
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "example.zip" },
};
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <TextField size={size} key={size} label={size} />
      ))}
    </div>
  ),
};
