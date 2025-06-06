import { fireEvent, render } from "@testing-library/react";

import DragDropFileUpload from "@/components/DragDropFileUpload";

describe("DragDropFileUpload", () => {
  const mockOnFileUpload = jest.fn();

  it("should render upload input and button", () => {
    const { getByText } = render(
      <DragDropFileUpload onFileUpload={mockOnFileUpload} />,
    );

    expect(
      getByText("Drag and drop files here or click to select files"),
    ).toBeInTheDocument();
  });

  it.skip("should call onFileUpload when a file is selected via input", () => {
    const { getByLabelText } = render(
      <DragDropFileUpload onFileUpload={mockOnFileUpload} />,
    );

    const fileInput = getByLabelText("upload picture");
    const file = new File(["test content"], "testfile.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // not bind click
    expect(mockOnFileUpload).toHaveBeenCalledWith(expect.any(FileList));
  });

  it.skip("should call onFileUpload when a file is dropped", () => {
    const { getByRole } = render(
      <DragDropFileUpload onFileUpload={mockOnFileUpload} />,
    );

    // TODO: new query
    const dropZone = getByRole("presentation"); // The Paper element
    const file = new File(["test content"], "testfile.txt", {
      type: "text/plain",
    });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(mockOnFileUpload).toHaveBeenCalledWith(expect.any(FileList));
  });

  it.skip("should change border style when dragging over", () => {
    const { getByRole } = render(
      <DragDropFileUpload onFileUpload={mockOnFileUpload} />,
    );

    // TODO: new query
    const dropZone = getByRole("presentation");

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveStyle("border: 2px dashed #000");

    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveStyle("border: 2px dashed #aaa");
  });
});
