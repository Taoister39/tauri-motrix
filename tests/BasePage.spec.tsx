import { Typography } from "@mui/material";
import { render, screen } from "@testing-library/react";

import BasePage from "@/components/BasePage";

describe("BasePage Component", () => {
  it("should renders the title correctly", () => {
    render(<BasePage title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("should renders the header correctly", () => {
    render(<BasePage header={<Typography>Test Header</Typography>} />);
    expect(screen.getByText("Test Header")).toBeInTheDocument();
  });

  it("should renders children correctly", () => {
    render(
      <BasePage>
        <p>Test Child</p>
      </BasePage>,
    );
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("should applies the correct styles when 'full' is true", () => {
    const { container } = render(<BasePage full />);
    expect(container.querySelector("article")).toHaveStyle("overflow: visible");
  });

  it("should renders the floating action button (FAB) correctly", () => {
    render(<BasePage fab={<button>FAB</button>} />);
    expect(screen.getByText("FAB")).toBeInTheDocument();
  });
});
