---
column: review
labels: [extension]
priority: high
package: extension
agent: codex
live: false
updatedAt: 2026-09-10T21:38:00.000Z
---
# VS Code extension

A custom editor that previews a spec in the current VS Code theme, plus the two
commands that make the static site reachable without touching a terminal.

Bundling matters here: `vsce` cannot resolve `workspace:*` dependencies, so the
extension must be esbuild-bundled to a single file with `dist-webview/` copied in
before packaging. Get that working early — discovering it at packaging time is a
classic late derailment.

## Checklist

- [x] Custom editor `apibox.preview` with live re-parse on document change
- [x] `APIBox: Preview API Document`
- [x] `APIBox: Build Static Site`
- [x] `APIBox: Deploy Static Site to GitHub Pages`
- [x] esbuild bundling + webview asset copy + `vsce package`

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T18:02:04.000Z): Claimed after the static-site generator entered Review. Starting with the custom editor and the already-defined correlated webview protocol, then layering the build and deploy commands over the tested CLI API.
- **codex** (2026-09-10T18:16:50.000Z): Moved to Review. The optional custom editor parses the active document through core, serves the viewer over shared runtime-validated request/response guards, and debounces live document refreshes with disposal-safe error handling. Preview, static build and Pages workflow commands are contributed; the workflow keeps user input YAML- and shell-safe. The extension host is esbuild-bundled, webview/static assets are staged before replacement, and `apibox-vscode-0.1.0.vsix` packages cleanly at 2.25 MB with a one-click Extension Host launch task. The full Review gate is green: 230 source tests, all workspace builds, zero clean-code markers above 0.5, and all three independent clean-code re-checks clear.
- **codex** (2026-09-10T21:38:00.000Z): Fixed VS Code webview navigation after reproducing the failure with a true workbench-level pointer click. VS Code delivered the complete click sequence but suppressed the anchor's default hash change, so the shared viewer now handles unmodified document, section, right-rail and home clicks through its router while retaining real hrefs and modified-click behavior. Verified in a clean Extension Development Host: the section click changed `#/petstore` to `#/petstore/listpets`, scrolled from 0 to 1034.5px, and the document click returned to `#/petstore`. Typecheck, lint, 243 unit tests, 20 Playwright tests and the official Extension Host integration test are green.
