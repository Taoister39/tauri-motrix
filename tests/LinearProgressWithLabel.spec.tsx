import { render } from "@testing-library/react";

import LinearProgressWithLabel from "@/components/LinearProgressWithLabel";

describe("LinearProgressWithLabel Component", () => {
  it("should render 100% label", () => {
    const { getByText } = render(<LinearProgressWithLabel value={100} />);

    expect(getByText("100%")).toBeInTheDocument();
  });
});
