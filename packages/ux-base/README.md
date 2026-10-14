# @tauri-motrix/ux-base

Shared React, native HTML, and StyleX components for the desktop app, Next.js website,
and browser extension. Components receive data, labels, and callbacks; they do not
read download state or call platform APIs.

## Setup

Use the Node.js and pnpm versions specified in the root package.json.

```sh
pnpm install
pnpm --filter @tauri-motrix/ux-base build
```

Watch the library during development:

```sh
pnpm --filter @tauri-motrix/ux-base dev
```

## Usage

Import CSS once at the application entry point. Consumers do not need a StyleX
compiler plugin. In Next.js, import CSS in the root layout and use interactive
components from client components.

```tsx
import "@tauri-motrix/ux-base/styles.css";
import { Button, TextField } from "@tauri-motrix/ux-base/components";
import { UxTheme } from "@tauri-motrix/ux-base/theme";

<UxTheme mode="system">
  <TextField label="Resource name" defaultValue="example.zip" />
  <Button onClick={save}>Save</Button>
</UxTheme>;
```

| Entry       | Purpose                                                                               |
| ----------- | ------------------------------------------------------------------------------------- |
| /tokens     | Platform-independent themeValues, designTokens, and types                             |
| /theme      | Scoped UxTheme with light, dark, and system modes; defaults to system                 |
| /components | Button, IconButton, TextField, Checkbox, Switch, Progress, EmptyState, and MenuButton |
| /styles.css | Static CSS for all themes and components; no runtime style injection                  |
| Root entry  | Existing exports plus the new components and theme                                    |

Components support native attributes, events, ref, className, style, and aria-\*;
they do not expose MUI sx. Buttons default to type="button"; set type="submit"
explicitly for form submission. Loading preserves the label and disables actions.
IconButton requires aria-label. Input controls require a label and support native
controlled and uncontrolled conventions.

Progress treats a missing or non-finite value as unknown and does not display a
percentage. Known values are clamped to 0-100. Progress labels are associated with
the accessible name; callers may also provide aria-label explicitly.

## Design and themes

src/tokens.ts is the single source for colors and foundational values. Builds
generate StyleX definitions using defineVars and createTheme. Do not edit
src/generated or dist manually.

UxTheme renders a div, supports nested scopes, and does not persist preferences.
System mode uses CSS media queries, so the initial appearance does not depend on
JavaScript detecting the color scheme. Future portal components must preserve the
theme scope inside their containers.

The desktop app uses UxThemeBridge to follow the existing MUI preference. The
website explicitly uses light mode for its existing white pages and retains its
Tailwind layout. The extension verification page supports all three modes, resets
when closed, and does not connect to the download service.

Animations respect reduced-motion. Inputs retain native keyboard behavior, and
buttons and menu controls provide focus-visible styles.

Static CSS is produced by collecting StyleX compiler metadata across all source
modules, avoiding missing rules in the current plugin's bundleless output. This
pass shares compiler options with the JavaScript transform. Consumers only use
the compiled output.

## Storybook and verification

```sh
pnpm --filter @tauri-motrix/ux-base build
pnpm --filter @tauri-motrix/ux-base docs:dev
# Build the static component showcase.
pnpm --filter @tauri-motrix/ux-base docs:build
# Build the desktop app before running tests.
pnpm build
pnpm test --selectProjects ux-base --runInBand
pnpm --filter @tauri-motrix/extensions build:edge
```

Storybook consumes dist, just like the three applications. Start the library's
watch build when editing components. Its toolbar selects light, dark, or system
mode. Theme/Scoped demonstrates nested themes. Use Tab and Space/Enter to check
keyboard interaction.

Unit tests cover events, disabled controls, label associations, and state
boundaries. Real-browser checks also cover CSS, focus, and system themes.

The library is currently consumed through the workspace. Changesets records
version changes; the package is not published to npm. Later phases will add
Dialog, Drawer, Tooltip, and Menu based on real application needs, followed by
resource and task components.
