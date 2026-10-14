# @tauri-motrix/extensions

## Shared component verification extension

This Manifest V3 extension verifies ux-base themes, keyboard interaction, forms,
and progress controls in a real browser. It requires no browser permissions,
does not read web pages, and does not connect to the download service. State
resets each time the popup opens.

## Development

```sh
pnpm install
pnpm --filter @tauri-motrix/ux-base build
pnpm --filter @tauri-motrix/extensions build:edge
```

Enable Developer mode at chrome://extensions or edge://extensions, choose
"Load unpacked", and select apps/extensions/unpacked. Click the toolbar icon to
open the 360px popup. Scripts and styles are local files and comply with the
default Manifest V3 CSP. Load the production build when testing the extension.

For a web preview, run pnpm --filter @tauri-motrix/extensions dev and visit
http://localhost:2542/popup. Run pnpm --filter @tauri-motrix/extensions typecheck
for TypeScript validation.

## Acceptance checks

- Switch between light, dark, and system modes.
- Use Tab to focus controls and Space to toggle checkbox and switch controls.
- Confirm the verification option, then submit an empty name to see an error.
- Submit a valid name to see confirmation.
- Enable unknown progress and confirm that no percentage is displayed.
- Reopen the popup and confirm that its state resets.
- Check for horizontal overflow and CSP errors.

## Acknowledgements

[React](https://github.com/facebook/react)
