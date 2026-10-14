import { createRsbuild, loadConfig } from "@rsbuild/core";

async function build(target) {
  if (target !== "edge" && target !== "chrome")
    throw new Error(`Unsupported browser: ${target}`);
  const { content } = await loadConfig();
  const rsbuild = await createRsbuild({ rsbuildConfig: content });
  await rsbuild.build();
}

export default build;
