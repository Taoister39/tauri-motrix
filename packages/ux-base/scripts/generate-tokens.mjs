import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import ts from "typescript";

// Transpile only this pure values module: no platform APIs or dependencies.
export async function generateTokens() {
  const source = await readFile(
    new URL("../src/tokens.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  });
  const { themeValues, designTokens } = await import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
  const folder = new URL("../src/generated/", import.meta.url);
  await mkdir(folder, { recursive: true });
  const system = Object.fromEntries(
    Object.entries(themeValues.light).map(([key, value]) => [
      key,
      {
        default: value,
        "@media (prefers-color-scheme: dark)": themeValues.dark[key],
      },
    ]),
  );
  const variables = `// Generated from tokens.ts. Do not edit.\nimport * as stylex from "@stylexjs/stylex";\nexport const colors = stylex.defineVars(${JSON.stringify(themeValues.light)});\nexport const metrics = stylex.defineVars(${JSON.stringify(designTokens)});\n`;
  const themes = `// Generated from tokens.ts. Do not edit.\nimport * as stylex from "@stylexjs/stylex";\nimport { colors } from "./tokens.stylex";\nexport const lightTheme = stylex.createTheme(colors, ${JSON.stringify(themeValues.light)});\nexport const darkTheme = stylex.createTheme(colors, ${JSON.stringify(themeValues.dark)});\nexport const systemTheme = stylex.createTheme(colors, ${JSON.stringify(system)});\n`;
  for (const [name, contents] of [
    ["tokens.stylex.ts", variables],
    ["themes.ts", themes],
  ]) {
    const file = new URL(name, folder);
    const previous = await readFile(file, "utf8").catch(() => "");
    if (previous !== contents) await writeFile(file, contents);
  }
}
