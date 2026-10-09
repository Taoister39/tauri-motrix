import { buildDownloadOptions, TaskForm } from "@/utils/task_options";

const form: TaskForm = {
  link: "https://example.test/file",
  out: "file.zip",
  dir: "Downloads",
  split: 16,
  userAgent: "  Mozilla/5.0 Custom  ",
  selectFiles: [1, 3],
};

it("builds URL options with a trimmed User-Agent and no torrent selection", () => {
  expect(buildDownloadOptions(form, "url")).toEqual({
    out: "file.zip",
    dir: "Downloads",
    split: 16,
    "user-agent": "Mozilla/5.0 Custom",
  });
});

it.each(["", "   "])(
  "omits an empty User-Agent (%j) to keep engine defaults",
  (userAgent) => {
    expect(
      buildDownloadOptions({ ...form, userAgent }, "url"),
    ).not.toHaveProperty("user-agent");
  },
);

it("keeps torrent options and one-based file selection when Vortex is selected", () => {
  expect(buildDownloadOptions(form, "torrent", "vortex")).toEqual({
    out: "file.zip",
    dir: "Downloads",
    split: 16,
    "user-agent": "Mozilla/5.0 Custom",
    "select-file": "1,3",
  });
});

it("omits split only for Vortex HTTP downloads", () => {
  expect(buildDownloadOptions(form, "url", "vortex")).not.toHaveProperty(
    "split",
  );
  expect(
    buildDownloadOptions(
      { ...form, link: "magnet:?xt=urn:btih:abc" },
      "url",
      "vortex",
    ),
  ).toHaveProperty("split", 16);
});
