import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { fireEvent, render } from "@testing-library/react";

import PathComboBox from "@/components/PathComboBox";

// Mock the dialogOpen function
jest.mock("@tauri-apps/plugin-dialog", () => ({
  open: jest.fn().mockResolvedValue("/mock/path"),
}));

// Mock the useTranslation hook
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      switch (key) {
        case "common.DownloadPath":
          return "Download Path";
        default:
          return key;
      }
    },
  }),
}));

describe("PathComboBox", () => {
  it("renders correctly", () => {
    const { getByLabelText, getByDisplayValue } = render(
      <PathComboBox value="/test/path" />,
    );

    expect(getByLabelText("Download Path")).toBeInTheDocument();
    expect(getByDisplayValue("/test/path")).toBeInTheDocument();
  });

  it("opens folder picker on icon click", async () => {
    const mockSetValue = jest.fn();

    const { getByTestId } = render(
      <PathComboBox value="" setValue={mockSetValue} />,
    );

    // Click the folder icon
    fireEvent.click(getByTestId("open-folder-pick"));

    // Wait for the mock dialog to resolve
    await new Promise(process.nextTick);

    // Verify the function was called
    expect(dialogOpen).toHaveBeenCalled();
    expect(mockSetValue).toHaveBeenCalledWith("/mock/path");
  });
});
