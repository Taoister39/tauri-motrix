import { render } from "@testing-library/react";

import { BaseDialog } from "@/components/BaseDialog";

describe("BaseDialog", () => {
  it("should render without crashing", () => {
    // Mock the useTranslation hook
    jest.mock("react-i18next", () => ({
      useTranslation: () => ({
        t: (key: string) => key,
      }),
    }));

    // Render the BaseDialog component
    const { getByText } = render(
      <BaseDialog open={true} title="Test Title" onClose={() => {}}>
        Test Content
      </BaseDialog>,
    );

    // Check if the title and content are rendered
    expect(getByText("Test Title")).toBeInTheDocument();
    expect(getByText("Test Content")).toBeInTheDocument();
  });
});
