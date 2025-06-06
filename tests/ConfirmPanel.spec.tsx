import { render, screen } from "@testing-library/react";

import ConfirmPanel from "@/components/ConfirmPanel";

describe("ConfirmPanel Component", () => {
  it("renders children", () => {
    render(
      <ConfirmPanel>
        <div>Test Content</div>
      </ConfirmPanel>,
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });
});
