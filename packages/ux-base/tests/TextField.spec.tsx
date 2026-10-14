import { fireEvent, render, screen } from "@testing-library/react";

import { TextField } from "../dist/components";

it("connects labels and errors while preserving native changes", () => {
  const onChange = jest.fn();
  render(
    <TextField
      label="Name"
      error="Required"
      aria-describedby="external"
      defaultValue="Old"
      onChange={onChange}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Name" });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Required");
  expect(input.getAttribute("aria-describedby")).toContain("external");
  fireEvent.change(input, { target: { value: "New" } });
  expect(input).toHaveValue("New");
  expect(onChange).toHaveBeenCalledTimes(1);
});
