#!/usr/bin/env node

/**
 * Wrap the Tauri CLI to provide a predictable build environment across machines.
 * - Disables linuxdeploy stripping to avoid failures on distros with RELR-enabled toolchains.
 * - Turns off updater artifact generation when no signing key is present, so local packaging succeeds.
 */
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const env = { ...process.env, NO_STRIP: '1' };

const hasSigningKey =
  typeof process.env.TAURI_SIGNING_PRIVATE_KEY === 'string' &&
  process.env.TAURI_SIGNING_PRIVATE_KEY.trim().length > 0;

if (hasSigningKey) {
  const override = { bundle: { createUpdaterArtifacts: true } };
  env.TAURI_CONFIG = JSON.stringify(
    mergeConfig(readExistingConfig(process.env.TAURI_CONFIG), override)
  );
}

const child = spawn('tauri', args, { stdio: 'inherit', env, shell: false });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

function readExistingConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[run-tauri]', 'Failed to parse TAURI_CONFIG override, using default:', error);
    return {};
  }
}

function mergeConfig(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeConfig(base?.[key] ?? {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
