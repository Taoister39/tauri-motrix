import { createTheme, ThemeProvider } from "@mui/material";
import { app } from "@tauri-apps/api";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ThemeModeSwitch from "@/business/setting/ThemeModeSwitch";
import { UxThemeBridge } from "@/components/UxThemeBridge";

jest.mock("@tauri-apps/api", () => ({
  app: { setTheme: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

it("updates the native window and shared theme using the existing mode switch", async () => {
  render(
    <ThemeProvider
      theme={createTheme({ colorSchemes: { light: true, dark: true } })}
      defaultMode="light"
    >
      <UxThemeBridge>
        <ThemeModeSwitch />
      </UxThemeBridge>
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "ThemeMode.dark" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "ThemeMode.dark" }),
    ).toHaveAttribute("aria-pressed", "true"),
  );
  expect(app.setTheme).toHaveBeenCalledWith("dark");
  expect(screen.getByRole("group").closest("[data-ux-theme]")).toHaveAttribute(
    "data-ux-theme",
    "dark",
  );
  fireEvent.click(screen.getByRole("button", { name: "ThemeMode.system" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "ThemeMode.system" }),
    ).toHaveAttribute("aria-pressed", "true"),
  );
  expect(app.setTheme).toHaveBeenLastCalledWith(null);
});
