import type { DownloadOption } from "@/services/download";

export type TaskSource = "url" | "torrent";

export interface TaskForm {
  link: string;
  out: string;
  split?: number;
  dir: string;
  userAgent: string;
  selectFiles: Array<string | number>;
}

export function usesVortex(
  source: TaskSource,
  link: string,
  httpEngine?: MotrixConfig["http_engine"],
) {
  return (
    source === "url" &&
    httpEngine === "vortex" &&
    /^https?:\/\//i.test(link.trim())
  );
}

export function buildDownloadOptions(
  form: TaskForm,
  source: TaskSource,
  httpEngine?: MotrixConfig["http_engine"],
): DownloadOption {
  const options: DownloadOption = { dir: form.dir, out: form.out };
  if (
    !usesVortex(source, form.link ?? "", httpEngine) &&
    form.split !== undefined
  ) {
    options.split = Number(form.split);
  }
  const userAgent = form.userAgent.trim();
  if (userAgent) options["user-agent"] = userAgent;
  if (source === "torrent") options["select-file"] = form.selectFiles.join(",");
  return options;
}
