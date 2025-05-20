import { act, cleanup, screen } from "@testing-library/react";

import { Notice } from "@/components/Notice";

describe("Notice Component", () => {
  afterEach(() => {
    cleanup();
    document.querySelector("#notice-container")?.firstChild?.remove();
  });

  afterAll(() => {
    document.querySelector("#notice-container")?.remove();
  });

  it("should renders an info message correctly", () => {
    act(() => {
      Notice.info("Info Message");
    });
    expect(screen.getByText("Info Message")).toBeInTheDocument();
  });

  it("should renders a success message correctly", () => {
    act(() => {
      Notice.success("Success Message");
    });
    expect(screen.getByText("Success Message")).toBeInTheDocument();
  });

  it("should renders an error message correctly", () => {
    act(() => {
      Notice.error("Error Message");
    });
    expect(screen.getByText("Error Message")).toBeInTheDocument();
  });

  it("should applies the correct timeout for error messages", () => {
    jest.useFakeTimers();
    act(() => {
      Notice.error("Timed Error Message");
    });

    expect(screen.getByText("Timed Error Message")).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    expect(screen.queryByText("Timed Error Message")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("should handles close action properly", () => {
    act(() => {
      Notice.success("Closable Message");
    });

    // const container = screen
    //   .getByText("Closable Message")
    //   .closest("div[role=presentation]");

    // expect(container).not.toBeNull();

    const closeButton = screen.getByRole("button");

    act(() => {
      closeButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(screen.queryByText("Closable Message")).not.toBeInTheDocument();
  });
});
