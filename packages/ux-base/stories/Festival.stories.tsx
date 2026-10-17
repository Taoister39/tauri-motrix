import { Button, Stack } from "@mui/material";
import { useState } from "react";
import type { Meta, StoryObj } from "storybook-react-rsbuild";

import {
  FestivalBrand,
  FestivalEmptyState,
  FestivalProvider,
  FestivalResourceRow,
  FestivalToggleCard,
} from "../dist/festival";

function FestivalShowcase({ mode = "light" }: { mode?: "light" | "dark" }) {
  const [enabled, setEnabled] = useState(true);
  const [selected, setSelected] = useState(false);
  return (
    <FestivalProvider mode={mode}>
      <Stack
        spacing={2}
        sx={{
          p: 3,
          width: 420,
          maxWidth: "100%",
          bgcolor: "background.default",
        }}
      >
        <FestivalBrand suffix="COMPANION" />
        <FestivalToggleCard
          title="Download with Motrix"
          description="Keep your collection on your device."
          checked={enabled}
          onChange={setEnabled}
        />
        <Stack component="ul" sx={{ p: 0, m: 0 }}>
          <FestivalResourceRow
            title="Orbit concert.webm"
            subtitle="42 MB · example.org"
            badge="VIDEO"
            icon="↓"
            checked={selected}
            onSelect={setSelected}
          />
        </Stack>
        <Button variant="contained" disabled={!selected}>
          Send selected resource
        </Button>
        <FestivalEmptyState
          icon="✦"
          title="Ready when you are"
          description="A reusable empty state with caller-owned content."
        />
      </Stack>
    </FestivalProvider>
  );
}
const meta = {
  title: "Festival/Companion components",
  component: FestivalShowcase,
} satisfies Meta<typeof FestivalShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { args: { mode: "dark" } };
