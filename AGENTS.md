# Repository Guidelines

## Pre-Generation Invariants

Read these rules before writing code or documentation.

- **Only English.** All natural-language content written or modified in this repository must be in English. This includes code comments, docstrings, documentation, README files, agent instructions, changelogs, changesets, commit messages, PR descriptions, test names and descriptions, logs, error messages, and hard-coded UI copy. The only exception is i18n language resources: translation values may use their target language. Keep translation keys and developer-facing explanations in English. This rule governs repository content; it does not require English replies in the conversation.
- **Keep localized copy in i18n resources.** Use the existing i18next integration instead of embedding translated text in components. Desktop locale sources live in `src/locales/*.json`; preserve keys, placeholders, and interpolation syntax across languages.
- **Default to no code comments.** Add a comment only when it records non-obvious context, an invariant, a platform workaround, or a trade-off that naming and types cannot explain. Do not narrate the code, paraphrase types, or describe the edit being made. Any necessary comment must be in English.
- **Never hand-edit generated output.** Change sources and regenerate artifacts through the existing build or preparation scripts. See Dependencies and Generated Files below.
- **Use the declared toolchain.** Follow `package.json` for Node.js and pnpm versions (currently Node.js >=22 and pnpm 10.12.4). Do not switch to npm, Yarn, or Bun. Follow each Rust crate's declared edition.
- **Preserve unrelated work.** Inspect the working tree before editing; do not reset, overwrite, format, or stage unrelated changes.
- **Avoid duplicate development servers.** Reuse an existing server when available. Tauri starts the desktop frontend through its configured `beforeDevCommand`; do not also start a separate frontend server on port 2539.

## Project Structure

This repository combines a pnpm workspace with a Cargo workspace.

| Path                                                      | Responsibility                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/`                                                    | Desktop React frontend, built with Rsbuild; MUI, Zustand, SWR, and i18next integrations              |
| `src/business/`, `src/pages/`, `src/components/`          | Application features, screens, and desktop UI                                                        |
| `src/services/`, `src/store/`, `src/hooks/`, `src/utils/` | Platform and engine adapters, state, hooks, and utility functions                                    |
| `src-tauri/`                                              | Tauri v2 application, Rust commands, process lifecycle, configuration, tray, and native integrations |
| `crates/vortex/`                                          | Standalone HTTP(S) download engine (`tauri-motrix-vortex`)                                           |
| `crates/upnp-mapping/`                                    | UPnP port-mapping library (`upnp-mapping`)                                                           |
| `packages/aria2/`                                         | Shared aria2 RPC client and mocks                                                                    |
| `packages/unified-base/`                                  | Shared utility library                                                                               |
| `packages/ux-base/`                                       | Shared React and StyleX components, theme tokens, and Storybook                                      |
| `packages/torrent/`                                       | Torrent-related library                                                                              |
| `apps/website/`                                           | Next.js website                                                                                      |
| `apps/extensions/`                                        | Browser extension and its build tooling                                                              |
| `tests/`                                                  | Desktop Jest tests, snapshots, and platform mocks                                                    |
| `scripts/`                                                | Sidecar preparation, engine builds, release tooling, and Node.js script tests                        |
| `.github/workflows/`                                      | Formatting, testing, engine builds, and release workflows                                            |

## Architecture and Boundaries

- Keep shared code in the appropriate workspace package. Use public package exports rather than reaching into another package's `src/` directory.
- Keep `packages/ux-base` independent of application state and native APIs. Components receive data, copy, and callbacks through props. Keep shared colors and scales in `packages/ux-base/src/tokens.ts` and import the built stylesheet once at each application's entry point.
- Keep Tauri commands and platform behavior in `src-tauri`; use frontend service adapters for IPC. Review capability files when adding or changing native access.
- Keep Vortex independent of Tauri. aria2 remains the default engine and handles BT, magnet links, and external RPC clients. Preserve engine-qualified task identity, existing task ownership, history, and recovery when changing engine integration.
- Trace changes through callers, state, events, persistence, IPC, and platform-specific paths. Prefer the smallest fix that addresses the root cause and preserves the observable behavior of other consumers.
- Preserve existing configuration and stored-data compatibility unless a migration is part of the requested change. Do not expose RPC secrets, request headers, or other credentials in logs or errors.

## Dependencies and Generated Files

- Keep shared JavaScript dependency versions in `pnpm-workspace.yaml` catalogs and reference them with `catalog:`. Use `workspace:*` for internal package dependencies.
- Keep shared Rust dependencies in root `Cargo.toml` under `[workspace.dependencies]` and use workspace inheritance where appropriate.
- Update lockfiles with the relevant package manager when dependencies change; do not hand-edit them.
- Do not hand-edit `dist/`, `target/`, `.next/`, `storybook-static/`, `apps/extensions/unpacked/`, or Tauri-generated schemas under `src-tauri/gen/schemas/`.
- `packages/ux-base/src/generated/` is generated from token sources during the package build. Edit `src/tokens.ts` or the generator, then rebuild `@tauri-motrix/ux-base`.
- `src-tauri/resources/locales/` is copied from `src/locales/` by `pnpm check`. Edit locale sources, then run the preparation script when native resources need refreshing.
- `src-tauri/sidecar/` contains prepared aria2 binaries. `pnpm check` downloads the sidecar and copies locale resources; it is a setup command, not a linter or type checker. It requires network access.
- Keep generated build outputs out of commits unless the repository explicitly tracks the artifact. Commit required tracked generated changes alongside their source changes.

## Build and Development

Run commands from the repository root unless a package is explicitly selected.

| Task                                | Command                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| Install dependencies                | `pnpm install` (`pnpm install --frozen-lockfile` in CI) |
| Prepare native resources and aria2  | `pnpm check`                                            |
| Build desktop frontend              | `pnpm build`                                            |
| Build a workspace library           | `pnpm --filter @tauri-motrix/<package> build`           |
| Run desktop with native integration | `pnpm tauri dev`                                        |
| Run frontend only                   | `pnpm dev`                                              |
| Build native desktop bundle         | `pnpm tauri build`                                      |
| Build website                       | `pnpm --filter @tauri-motrix/website build`             |
| Build extension                     | `pnpm --filter @tauri-motrix/extensions build`          |
| Build Edge extension package        | `pnpm --filter @tauri-motrix/extensions build:edge`     |
| Build component documentation       | `pnpm --filter @tauri-motrix/ux-base docs:build`        |

- Install the Tauri platform prerequisites before native builds. Windows ARM and Linux ARM may also require LLVM/clang for `ring`; consult `README.md`.
- Root `pnpm build` builds the desktop frontend; it is not a recursive workspace build. If shared-package sources changed, build the affected packages and their changed dependencies in dependency order before building consumers or running tests.
- Use package scripts and pnpm filters rather than inventing parallel build paths. Do not run release or updater publishing workflows as routine validation.

## Coding Style

- Follow `.prettierrc`: spaces rather than tabs, double-quoted JavaScript/TypeScript strings, semicolons, and parenthesized arrow parameters. Use the formatter instead of manual style adjustments.
- Follow `eslint.config.js`, including sorted imports/exports and the React Hooks rules. Do not introduce a separate formatter or import-order convention.
- Respect the strict TypeScript settings. Prefer existing shared types or `unknown` with narrowing over `any`; fix type errors rather than adding suppression directives.
- Match neighboring naming conventions: React components use PascalCase; hooks use `useX`; Rust modules use snake_case. Desktop aliases are `@/` for `src/` and `@root/` for the repository root.
- Use rustfmt for Rust. The workspace denies `clippy::dbg_macro`; use the existing logging facilities instead of `dbg!`. Handle fallible operations and asynchronous task lifecycles explicitly.
- Preserve accessible names, native keyboard behavior, focus visibility, disabled states, and reduced-motion support when changing shared UI.

## Testing and Validation

- **Run `pnpm build` once before unit or e2e tests, including focused runs.** Tests depend on built workspace packages. Rebuild affected libraries first when their sources changed. Repeat the build if later changes make the tested output stale.
- Use unit tests for single-function behavior. Keep tests minimal and focused on observable behavior; avoid redundant coverage, implementation details, and unnecessary complexity.
- Add regression coverage for behavioral fixes at the narrowest useful layer. Use existing Jest and Testing Library setup for frontend behavior, Node.js tests for scripts, and crate tests for Rust logic. Documentation-only changes need formatting validation, not a full build or test run.
- Update **all affected unit test snapshots**, not just a subset. Review snapshot differences and avoid accepting unrelated changes.
- Jest has `common-platform` and `ux-base` projects in `jest.config.ts`. Confirm that new tests are included by the relevant project's `testMatch`; the torrent test directory is currently excluded.
- Examples after the required build:
  - Focused desktop test: `pnpm test --selectProjects common-platform --runInBand --runTestsByPath tests/task.test.ts`.
  - Shared UI tests: `pnpm test --selectProjects ux-base --runInBand`.
  - Script tests: `node --test scripts/*.test.mjs` (or select the affected file).
  - Rust engine tests: `cargo test --locked -p tauri-motrix-vortex`.
  - Native application tests: `cargo test --manifest-path src-tauri/Cargo.toml`.
- Before declaring completion, run the fastest useful checks for the files changed:
  - Markdown, JSON, CSS, and supported source files: `pnpm exec prettier --check <files>`; use `--write` on touched files if necessary.
  - JavaScript/TypeScript: `pnpm exec eslint <files>` plus the relevant TypeScript check, such as `pnpm exec tsc --noEmit` for desktop sources or a package's `typecheck` script where provided. Do not pass Markdown files to ESLint.
  - Rust: `cargo fmt --all -- --check` and `cargo check -p <crate>`. Apply formatting only to touched files if other work is present. Use scoped Clippy checks when the change or CI validation warrants them.
  - UI: verify the affected interaction and visual states in the relevant application or Storybook when practical; compilation and snapshots do not establish layout or focus behavior.
- Prefer scoped checks over full-repository formatting or unrelated tests. Use `pnpm format:check` and broader builds/tests when the change spans consumers or shared contracts.
- Fix violations in source rather than weakening lint rules, tests, capabilities, or type safety. Report which checks passed, which were skipped or blocked, and any remaining uncertainty.

## Commits and Pull Requests

- Use English Conventional Commit messages with the types allowed by `commitlint.config.js`: `build`, `ci`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`.
- Keep changes focused. Explain the problem, resulting behavior, and validation; include screenshots for visible UI changes and compatibility notes when needed.
- Follow the existing Changesets workflow for shared-package changes that need a version or changelog entry. Write changesets in English.
- Update affected documentation when behavior or setup changes. Do not rewrite unrelated legacy content solely to enforce the language policy.
- Never commit secrets, local profiles, downloaded binaries, or unrelated generated output. Do not create commits, publish packages, or release builds unless requested.
