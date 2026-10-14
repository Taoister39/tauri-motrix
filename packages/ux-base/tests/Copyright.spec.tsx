import { render } from "@testing-library/react";

import BaseCopyright from "../src/base/Copyright";

describe("Copyright", () => {
  it("renders the correct text", () => {
    const { getByText } = render(<BaseCopyright />);
    expect(getByText("©2026 Tauri Motrix")).toBeInTheDocument();
  });
});
