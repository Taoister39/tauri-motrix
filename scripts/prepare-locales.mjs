import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export async function resolveLocales() {
  const source = path.join(process.cwd(), "src/locales");
  const target = path.join(process.cwd(), "src-tauri/resources/locales");
  await fsp.mkdir(target, { recursive: true });
  for (const file of await fsp.readdir(source)) {
    if (file.endsWith(".json")) {
      await fsp.copyFile(path.join(source, file), path.join(target, file));
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await resolveLocales();
}
