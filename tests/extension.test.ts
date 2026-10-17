import {
  classifyResource,
  defaults,
  isPreferences,
  isRequest,
  resourceName,
  selectResources,
} from "../apps/extensions/src/model";
import { handoffDownload } from "../apps/extensions/src/rpc";

describe("Extension resource discovery", () => {
  it("drops stale and sent selections before applying the batch limit", () => {
    const resources = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      url: `https://example.com/${index}.mp4`,
      name: String(index),
      mime: "video/mp4",
      kind: "video" as const,
      sent: index === 0,
    }));
    expect(selectResources(resources, ["stale", "0", "1", "1", "2"])).toEqual([
      "1",
      "2",
    ]);
    expect(
      selectResources(
        resources,
        resources.map((r) => r.id),
      ),
    ).toHaveLength(20);
  });
  it("classifies signed URLs without modifying their query", () => {
    expect(classifyResource("https://example.com/movie.MP4?token=abc")).toBe(
      "video",
    );
    expect(classifyResource("https://example.com/chunk", "audio/mp4")).toBe(
      "audio",
    );
    expect(
      classifyResource("https://example.com/playlist.m3u8", "video/mp2t"),
    ).toBe("stream");
    expect(
      classifyResource("https://example.com/manifest", "application/dash+xml"),
    ).toBe("stream");
    expect(resourceName("https://example.com/a%20b.mp4?token=private")).toBe(
      "a b.mp4",
    );
  });
  it("rejects privileged URLs and embedded credentials", () => {
    expect(classifyResource("file:///private.mp4")).toBeUndefined();
    expect(
      classifyResource("https://user:password@example.com/a.mp4"),
    ).toBeUndefined();
    expect(
      classifyResource("blob:https://example.com/id", "video/mp4"),
    ).toBeUndefined();
    expect(classifyResource("https://example.com/script.js")).toBeUndefined();
  });
  it("validates settings and messages at the extension boundary", () => {
    expect(isPreferences(defaults)).toBe(true);
    expect(isPreferences({ ...defaults, port: 65536 })).toBe(false);
    expect(isPreferences({ ...defaults, port: "16801" })).toBe(false);
    expect(isRequest({ type: "send", tabId: -1, ids: ["one"] })).toBe(false);
    expect(isRequest({ type: "send", tabId: 1, ids: [false] })).toBe(false);
    expect(isRequest({ type: "send", tabId: 1, ids: ["one"] })).toBe(true);
  });
});

describe("Browser download handoff", () => {
  function setup(fail?: "send" | "pause" | "cancel" | "resume") {
    const events: string[] = [];
    const operation = (name: string) =>
      jest.fn(async () => {
        events.push(name);
        if (name === fail) throw new Error("Unavailable");
      });
    return {
      events,
      operations: {
        pause: operation("pause"),
        send: operation("send"),
        cancel: operation("cancel"),
        resume: operation("resume"),
      },
    };
  }
  it("cancels the original only after Motrix accepts the task", async () => {
    const { events, operations } = setup();
    await handoffDownload(1, operations);
    expect(events).toEqual(["pause", "send", "cancel"]);
  });
  it("resumes the browser download when the handoff fails", async () => {
    const { events, operations } = setup("send");
    expect(await handoffDownload(1, operations)).toContain("resumed");
    expect(events).toEqual(["pause", "send", "resume"]);
  });
  it("does not enqueue downloads that cannot be paused", async () => {
    const { events, operations } = setup("pause");
    await handoffDownload(1, operations);
    expect(events).toEqual(["pause"]);
  });
  it("does not resume an accepted transfer if cancellation fails", async () => {
    const { events, operations } = setup("cancel");
    expect(await handoffDownload(1, operations)).toContain("paused");
    expect(events).toEqual(["pause", "send", "cancel"]);
  });
});
