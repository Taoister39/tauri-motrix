import { render } from "@testing-library/react";

import BaseDrawer from "@/components/BaseDrawer";

describe("BaseDrawer", () => {
  it("should render without crashing", () => {
    const { getByText } = render(
      <BaseDrawer open title="Test Title">
        Test Content
      </BaseDrawer>,
    );

    expect(getByText("Test Title")).toBeInTheDocument();
    expect(getByText("Test Content")).toBeInTheDocument();
  });
});
