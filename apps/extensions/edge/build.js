#!/usr/bin/env node

import chalk from "chalk";
import { execSync } from "child_process";
import { join } from "path";
import process from "process";
import yargs from "yargs";

const argv = yargs(process.argv.slice(2)).parseSync();

import build from "../build.js";

const main = async () => {
  const { crx } = argv;

  await build("edge");

  const cwd = process.cwd();
  if (crx) {
    const crxPath = join(cwd, "node_modules", ".bin", "crx");

    execSync(`${crxPath} pack ./unpacked -o MotrixWebExtension.crx`, {
      cwd,
    });
  }

  console.log(chalk.green("\nThe Microsoft Edge extension has been built!"));

  console.log(chalk.green("\nTo load this extension:"));
  console.log(chalk.yellow("Navigate to edge://extensions/"));
  console.log(chalk.yellow('Enable "Developer mode"'));
  console.log(chalk.yellow('Click "LOAD UNPACKED"'));
  console.log(chalk.yellow("Select extension folder - " + cwd + "\\unpacked"));
};

main();
