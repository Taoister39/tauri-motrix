import type { Meta, StoryObj } from "storybook-react-rsbuild";

import { Button, TextField } from "../dist/components";
import { UxTheme } from "../dist/theme";

const meta = { title: "Foundations/Theme", component: UxTheme } satisfies Meta<
  typeof UxTheme
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Scoped: Story = {
  render: () => (
    <UxTheme mode="dark" style={{ padding: 24, background: "Canvas" }}>
      <TextField label="Dark region" />
      <UxTheme
        mode="light"
        style={{ marginTop: 16, padding: 24, background: "Canvas" }}
      >
        <Button>Local light theme</Button>
      </UxTheme>
    </UxTheme>
  ),
};
