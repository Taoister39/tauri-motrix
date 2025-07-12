import { act, fireEvent, render } from "@testing-library/react";

import InputFileUpload from "@/components/InputFileUpload";

describe("InputFileUpload", () => {
  it("should render the upload button with default text", () => {
    const { getByText } = render(<InputFileUpload text="Upload Files" />);

    expect(getByText("Upload Files")).toBeInTheDocument();
  });

  it("should call onChange when files are selected", async () => {
    const mockOnChange = jest.fn();
    const { getByLabelText } = render(
      <InputFileUpload text="Upload" onChange={mockOnChange} />,
    );

    const fileInput = getByLabelText("Upload");
    const file = new File(["content"], "testfile.txt", { type: "text/plain" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(mockOnChange).toHaveBeenCalledWith([file]);
  });

  it("should display selected files when hideList is false", () => {
    const mockFileList = [
      new File(["content"], "file1.txt"),
      new File(["content"], "file2.txt"),
    ];

    const { getByText } = render(
      <InputFileUpload fileList={mockFileList} hideList={false} />,
    );

    expect(getByText("file1.txt")).toBeInTheDocument();
    expect(getByText("file2.txt")).toBeInTheDocument();
  });

  it("should remove a file when delete button is clicked", async () => {
    const mockOnChange = jest.fn();
    const mockFileList = [
      new File(["content"], "file1.txt"),
      new File(["content"], "file2.txt"),
    ];

    const { getAllByRole } = render(
      <InputFileUpload
        fileList={mockFileList}
        onChange={mockOnChange}
        hideList={false}
      />,
    );

    const deleteButton = getAllByRole("button")[1]; // Assuming first button is upload
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockOnChange).toHaveBeenCalledWith([mockFileList[1]]); // file1.txt is removed
  });
});
