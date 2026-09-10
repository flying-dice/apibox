---
column: review
labels: [extension]
priority: high
package: extension
agent: codex
live: false
updatedAt: 2026-09-10T18:16:50.000Z
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

## Comments

- **codex** (2026-09-10T18:02:04.000Z): Claimed after the static-site generator entered Review. Starting with the custom editor and the already-defined correlated webview protocol, then layering the build and deploy commands over the tested CLI API.
- **codex** (2026-09-10T18:16:50.000Z): Moved to Review. The optional custom editor parses the active document through core, serves the viewer over shared runtime-validated request/response guards, and debounces live document refreshes with disposal-safe error handling. Preview, static build and Pages workflow commands are contributed; the workflow keeps user input YAML- and shell-safe. The extension host is esbuild-bundled, webview/static assets are staged before replacement, and `apibox-vscode-0.1.0.vsix` packages cleanly at 2.25 MB with a one-click Extension Host launch task. The full Review gate is green: 230 source tests, all workspace builds, zero clean-code markers above 0.5, and all three independent clean-code re-checks clear.
