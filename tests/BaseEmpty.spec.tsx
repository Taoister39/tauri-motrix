import { render } from "@testing-library/react";

import { BaseEmpty } from "@/components/BaseEmpty";

describe("BaseEmpty Component", () => {
  it("should render without crashing", () => {
    // Mock the useTranslation hook
    jest.mock("react-i18next", () => ({
      useTranslation: () => ({
        t: (key: string) => key,
      }),
    }));

    // Render the BaseEmpty component
    const { getByText } = render(<BaseEmpty text="test" />);

    // Check if the text is rendered
    expect(getByText("test")).toBeInTheDocument();
  });

  it("should render with extra content", () => {
    // Mock the useTranslation hook
    jest.mock("react-i18next", () => ({
      useTranslation: () => ({
        t: (key: string) => key,
      }),
    }));

    // Render the BaseEmpty component with extra content
    const { getByText } = render(
      <BaseEmpty text="test" extra={<div>Extra Content</div>} />,
    );

    // Check if the extra content is rendered
    expect(getByText("Extra Content")).toBeInTheDocument();
  });
});
