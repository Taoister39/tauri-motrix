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

function createArchives(t, ...libraries) {
  const directory = mkdtempSync(path.join(tmpdir(), "macos-static-libs-"));
  t.after(() => {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  });
  return libraries.map((library) => {
    const libDir = path.join(directory, library).replaceAll("\\", "/");
    mkdirSync(libDir);
    writeFileSync(`${libDir}/lib${library}.a`, "");
    return libDir;
  });
}

test("links third-party archives and preserves system libraries and frameworks", (t) => {
  const [first, second] = createArchives(t, "ssh2", "crypto");

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

test("resolves SQLite's private zlib dependency using zlib's package search path", (t) => {
  const [sqlite, zlib] = createArchives(t, "sqlite3", "z");
  const result = run(
    `pkg-config() {
      printf '%s ' "$SQLITE_FLAGS"
      if [[ " $* " == *" zlib "* ]]; then
        printf '%s ' "$ZLIB_FLAGS"
      fi
      printf '\\n'
    }
    static_pkg_config sqlite3 zlib`,
    {
      SQLITE_FLAGS: `-L${sqlite} -lsqlite3 -lz`,
      ZLIB_FLAGS: `-L${zlib} -lz`,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    `${sqlite}/libsqlite3.a ${zlib}/libz.a ${zlib}/libz.a`,
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
