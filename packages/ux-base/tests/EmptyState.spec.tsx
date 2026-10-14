import { render, screen } from "@testing-library/react";

import { EmptyState } from "../src/base/EmptyState";

it("renders the supplied text and action", () => {
  render(<EmptyState text="No tasks" icon="↓" action={<button>Add</button>} />);
  expect(screen.getByText("No tasks")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
});
