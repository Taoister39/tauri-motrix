import { render } from "@testing-library/react";

import HelloWorld from "../src/template/HelloWorld";

describe("HelloWorld", () => {
  it("renders the correct text", () => {
    const { getByText } = render(<HelloWorld />);
    expect(getByText("Rsbuild with React")).toBeInTheDocument();
  });
});
