import { render, screen } from "@testing-library/react";

import { UxTheme } from "../src/theme";

it("preserves nested theme modes and defaults to system", () => {
  const { rerender } = render(
    <UxTheme mode="dark" data-testid="outer">
      <UxTheme mode="light" data-testid="inner">
        Content
      </UxTheme>
    </UxTheme>,
  );
  expect(screen.getByTestId("outer")).toHaveAttribute("data-ux-theme", "dark");
  expect(screen.getByTestId("inner")).toHaveAttribute("data-ux-theme", "light");
  rerender(<UxTheme data-testid="outer">System</UxTheme>);
  expect(screen.getByTestId("outer")).toHaveAttribute(
    "data-ux-theme",
    "system",
  );
});
