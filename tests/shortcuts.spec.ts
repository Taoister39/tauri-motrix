import {
  clipboardDownloadLink,
  formatShortcut,
  recordShortcut,
} from "@/utils/shortcuts";

it.each([
  "https://example.test/file.zip",
  "http://example.test/file",
  "ftp://example.test/file",
  `magnet:?xt=urn:btih:${"a".repeat(40)}`,
  `magnet:?xt=urn:btih:${"A".repeat(32)}`,
  `magnet:?xt=urn:btmh:1220${"a".repeat(64)}`,
])("prefills a complete single download link: %s", (link) => {
  expect(clipboardDownloadLink(`  ${link}\n`)).toBe(link);
});

it.each([
  "",
  "Read https://example.test/file",
  "https://a.test/\nhttps://b.test/",
  "file:///Downloads/file.zip",
  "C:\\Downloads\\file.zip",
  "javascript:alert(1)",
  "https:///",
  "https:example.test",
  "magnet:?dn=file",
  "magnet:?xt=urn:btih:invalid",
])("leaves unrelated or invalid clipboard content empty: %s", (text) => {
  expect(clipboardDownloadLink(text)).toBe("");
});

it("records physical keys with modifiers and formats platform labels", () => {
  const event = {
    code: "KeyN",
    ctrlKey: true,
    altKey: true,
    metaKey: false,
    shiftKey: true,
  };
  expect(recordShortcut(event)).toBe("shift+control+alt+KeyN");
  expect(recordShortcut({ ...event, code: "Digit1" })).toBe(
    "shift+control+alt+Digit1",
  );
  expect(recordShortcut({ ...event, code: "F24" })).toBe(
    "shift+control+alt+F24",
  );
  expect(
    recordShortcut({ ...event, ctrlKey: false, altKey: false }),
  ).toBeNull();
  expect(recordShortcut({ ...event, code: "Enter" })).toBeNull();
  expect(recordShortcut({ ...event, code: "F25" })).toBeNull();
  expect(formatShortcut("shift+super+alt+KeyN", true)).toBe(
    "Shift + Command + Option + N",
  );
  expect(formatShortcut("control+Digit1", false)).toBe("Ctrl + 1");
});
