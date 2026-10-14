import { createTheme, ThemeProvider, useColorScheme } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";

import { UxThemeBridge } from "@/components/UxThemeBridge";

it("follows MUI mode changes without a separate theme store", () => {
  function ModeControl() {
    const { setMode } = useColorScheme();
    return <button onClick={() => setMode("dark")}>Dark</button>;
  }
  render(
    <ThemeProvider
      theme={createTheme({ colorSchemes: { light: true, dark: true } })}
      defaultMode="light"
    >
      <UxThemeBridge>
        <ModeControl />
      </UxThemeBridge>
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Dark" }));
  expect(screen.getByRole("button").closest("[data-ux-theme]")).toHaveAttribute(
    "data-ux-theme",
    "dark",
  );
});
