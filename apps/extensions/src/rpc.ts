import type { Preferences } from "./model";

export async function callMotrix(
  preferences: Preferences,
  secret: string,
  method: "aria2.getVersion" | "aria2.addUri",
  params: unknown[] = [],
) {
  const id = crypto.randomUUID();
  const response = await fetch(`http://127.0.0.1:${preferences.port}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: [...(secret ? [`token:${secret}`] : []), ...params],
    }),
    signal: AbortSignal.timeout(6000),
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      "Motrix did not accept the request. Check the RPC port and secret.",
    );
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("id" in result) ||
    result.id !== id ||
    "error" in result ||
    !("result" in result)
  )
    throw new Error("Motrix rejected the request. Check the RPC secret.");
  if (
    method === "aria2.addUri" &&
    (typeof result.result !== "string" || !/^[a-f\d]{16}$/i.test(result.result))
  )
    throw new Error("Motrix returned an invalid task identifier.");
  if (
    method === "aria2.getVersion" &&
    (!result.result ||
      typeof result.result !== "object" ||
      !("version" in result.result))
  )
    throw new Error("This endpoint is not an aria2 RPC service.");
  return result.result;
}

export async function handoffDownload(
  id: number,
  operations: {
    pause: (id: number) => Promise<void>;
    send: () => Promise<unknown>;
    cancel: (id: number) => Promise<void>;
    resume: (id: number) => Promise<void>;
  },
): Promise<string | undefined> {
  try {
    await operations.pause(id);
  } catch {
    return "The browser download could not be paused and was left in the browser.";
  }
  try {
    await operations.send();
  } catch {
    try {
      await operations.resume(id);
    } catch {
      return "Motrix was unreachable. Resume the paused download in your browser.";
    }
    return "Motrix did not confirm the transfer. The browser download resumed; check Motrix before retrying.";
  }
  try {
    await operations.cancel(id);
  } catch {
    return "Sent to Motrix. The original browser download is paused; cancel it in the browser.";
  }
}
