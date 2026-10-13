import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const bash =
  process.platform === "win32"
    ? path.join(process.env.ProgramFiles, "Git", "bin", "bash.exe")
    : "bash";

function run(command, env) {
  return spawnSync(
    bash,
    ["-c", `source ./scripts/macos_static_libs.sh\n${command}`],
    { cwd: root, encoding: "utf8", env: { ...process.env, ...env } },
  );
}

test("links third-party archives and preserves system libraries and frameworks", (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "macos-static-libs-"));
  t.after(() => {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  });
  const first = path.join(directory, "first").replaceAll("\\", "/");
  const second = path.join(directory, "second").replaceAll("\\", "/");
  mkdirSync(first);
  mkdirSync(second);
  writeFileSync(`${first}/libssh2.a`, "");
  writeFileSync(`${second}/libcrypto.a`, "");

  const result = run(
    'pkg-config() { printf "%s\\n" "$FLAGS"; }\nstatic_pkg_config libssh2',
    {
      FLAGS: `-L${first} -lssh2 -L${second} -lcrypto -lresolv -framework Security`,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    `${first}/libssh2.a ${second}/libcrypto.a -lresolv -framework Security`,
  );
});

test("fails when a third-party static archive is missing", () => {
  const result = run(
    'pkg-config() { printf "%s\\n" "-lmissing"; }\nstatic_pkg_config expat',
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Static archive for -lmissing not found/);
});

test("propagates pkg-config failures", () => {
  const result = run("pkg-config() { return 2; }\nstatic_pkg_config expat");
  assert.equal(result.status, 1);
});

test("accepts binaries that only load macOS system libraries", () => {
  const result = run(
    'otool() { printf "%s\\n" "$DEPENDENCIES"; }\ncheck_macos_dependencies aria2c',
    {
      DEPENDENCIES:
        "aria2c:\n\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1.0.0)\n\t/System/Library/Frameworks/Security.framework/Versions/A/Security (compatibility version 1.0.0, current version 1.0.0)",
    },
  );
  assert.equal(result.status, 0, result.stderr);
});

test("rejects Homebrew and unresolved relative dynamic libraries", () => {
  for (const dependency of [
    "/opt/homebrew/opt/expat/lib/libexpat.1.dylib",
    "/usr/local/opt/expat/lib/libexpat.1.dylib",
    "@rpath/libexpat.1.dylib",
  ]) {
    const result = run(
      'otool() { printf "%s\\n" "$DEPENDENCIES"; }\ncheck_macos_dependencies aria2c',
      {
        DEPENDENCIES: `aria2c:\n\t${dependency} (compatibility version 1.0.0, current version 1.0.0)`,
      },
    );
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(dependency), result.stderr);
  }
});
