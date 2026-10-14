import { fireEvent, render, screen } from "@testing-library/react";

import { MenuButton } from "../dist/components";

it("exposes its name and expanded state and forwards clicks", () => {
  const onClick = jest.fn();
  render(<MenuButton open onClick={onClick} aria-controls="nav" />);
  const menu = screen.getByRole("button", { name: "Menu" });
  expect(menu).toHaveAttribute("aria-expanded", "true");
  expect(menu).toHaveAttribute("aria-controls", "nav");
  expect(menu).not.toHaveAttribute("open");
  fireEvent.click(menu);
  expect(onClick).toHaveBeenCalledTimes(1);
});
