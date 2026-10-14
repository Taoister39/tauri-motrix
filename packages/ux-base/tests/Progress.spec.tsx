import { render, screen } from "@testing-library/react";

import { Progress } from "../src/base/Progress";

it.each([
  [-10, 0],
  [130, 100],
])("clamps progress %s to %s", (value, expected) => {
  render(<Progress value={value} label="Download" showValue />);
  expect(screen.getByRole("progressbar", { name: "Download" })).toHaveAttribute(
    "aria-valuenow",
    String(expected),
  );
  expect(screen.getByText(`${expected}%`)).toBeInTheDocument();
});

it.each([undefined, NaN, Infinity])(
  "does not invent a percentage for unknown progress %s",
  (value) => {
    render(<Progress value={value} label="Download" showValue />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow",
    );
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  },
);
