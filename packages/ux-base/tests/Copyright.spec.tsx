import { render } from "@testing-library/react";

import Copyright from "../src/components/Copyright";

describe("Copyright", () => {
  it("renders the correct text", () => {
    const { getByText } = render(<Copyright />);
    expect(getByText("©2025 Tauri Motrix")).toBeInTheDocument();
  });
});
