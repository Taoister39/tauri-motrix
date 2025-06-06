import {
  filterAudioFiles,
  filterDocumentFiles,
  filterImageFiles,
  filterVideoFiles,
  getAsBase64,
  getFileExtension,
  getFileName,
  isAudioFile,
  isDocumentFile,
  isImageFile,
  isVideoFile,
  listTorrentFiles,
} from "@/utils/file"; // Adjust the path as needed

describe("File Utility Functions", () => {
  it("getFileName extracts correct file name", () => {
    expect(getFileName("/path/to/file.mp4")).toBe("file.mp4");
    expect(getFileName("C:\\folder\\document.pdf")).toBe("document.pdf");
  });

  it("getFileExtension extracts correct extension", () => {
    expect(getFileExtension("file.mp4")).toBe("mp4");
    expect(getFileExtension("document.pdf")).toBe("pdf");
    expect(getFileExtension("noextension")).toBe("");
  });

  it("filterVideoFiles filters correctly", () => {
    const files = [{ name: "video.mp4" }, { name: "audio.mp3" }];
    expect(filterVideoFiles(files)).toEqual([{ name: "video.mp4" }]);

    const fileWithExtensions = [{ name: "111", extension: ".mp3" }];
    expect(filterVideoFiles(fileWithExtensions)).toEqual([]);
  });

  it("isVideoFile identifies correctly", () => {
    expect(isVideoFile("video.mp4")).toBe(true);
    expect(isVideoFile("audio.mp3")).toBe(false);
  });

  it("filterAudioFiles filters correctly", () => {
    const files = [{ name: "video.mp4" }, { name: "audio.mp3" }];
    expect(filterAudioFiles(files)).toEqual([{ name: "audio.mp3" }]);
  });

  it("isAudioFile identifies correctly", () => {
    expect(isAudioFile("audio.mp3")).toBe(true);
    expect(isAudioFile("video.mp4")).toBe(false);
  });

  it("filterImageFiles filters correctly", () => {
    const files = [{ name: "image.png" }, { name: "document.pdf" }];
    expect(filterImageFiles(files)).toEqual([{ name: "image.png" }]);
  });

  it("isImageFile identifies correctly", () => {
    expect(isImageFile("image.png")).toBe(true);
    expect(isImageFile("document.pdf")).toBe(false);
  });

  it("filterDocumentFiles filters correctly", () => {
    const files = [{ name: "image.png" }, { name: "document.pdf" }];
    expect(filterDocumentFiles(files)).toEqual([{ name: "document.pdf" }]);
  });

  it("isDocumentFile identifies correctly", () => {
    expect(isDocumentFile("document.pdf")).toBe(true);
    expect(isDocumentFile("image.png")).toBe(false);
  });

  it("should listTorrentFiles return with extension", () => {
    const mockFiles = [
      {
        path: "test_1.jpg",
        name: "test_1.jpg",
        length: 0,
        offset: 0,
      },
    ];

    const result = listTorrentFiles(mockFiles);
    expect(result?.[0].extension).toBe(".jpg");
  });

  it("base64String resolve with a base64 string when given a valid file", async () => {
    const mockFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });

    const base64String = await getAsBase64(mockFile);

    expect(base64String).toBeTruthy();
    expect(typeof base64String).toBe("string");
  });

  it("base64String reject when result is not a string", async () => {
    const mockFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });

    // Mock FileReader globally
    const mockReadAsDataURL = jest.fn();
    const mockAddEventListener = jest.fn();
    const mockResult = jest.fn().mockReturnValue(new ArrayBuffer(0)); // Non-string result

    jest.spyOn(global, "FileReader").mockImplementation(
      () =>
        ({
          readAsDataURL: mockReadAsDataURL,
          addEventListener: mockAddEventListener.mockImplementation(
            (event, callback) => {
              if (event === "load") {
                callback(); // Simulate the load event
              }
            },
          ),
          result: mockResult(),
        }) as never,
    );

    await expect(getAsBase64(mockFile)).rejects.toBeInstanceOf(ArrayBuffer);
    expect(mockReadAsDataURL).toHaveBeenCalledWith(mockFile);
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
    );
  });
});
