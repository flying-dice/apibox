---
column: review
labels: [ui, viewer, extension, infra]
priority: high
package: viewer
agent: codex
live: false
status: implementation and automated review gates complete; awaiting human review
progress: 100
updatedAt: 2026-09-10T21:10:30.000Z
---
# Browser workspaces and installable PWA

Turn the GitHub Pages viewer into a local-first API workspace: people can create,
switch and delete named workspaces, import API description files, retain them across
refreshes, and install or use the site offline without sending their specifications away.

## Checklist

- [x] Persist named workspaces and imported API documents in browser storage
- [x] Create a polished workspace switcher and manager with create/delete flows
- [x] Import multiple JSON, YAML and YML specifications through picker and drag/drop
- [x] Surface import errors without losing valid files or existing workspace data
- [x] Preserve bundled examples as a discoverable read-only workspace
- [x] Keep the workspace/file navigation visually consistent with the extension viewer
- [x] Launch extension dev mode in an isolated VS Code examples workspace
- [x] Add an application manifest, icons and offline app-shell service worker
- [x] Cover storage, workspace operations and imports with unit and Playwright tests
- [x] Document privacy, persistence, offline behaviour and browser limitations

## Gates

- [x] tests-passing
- [x] clean-code-review

## Comments

- **codex** (2026-09-10T20:17:59.000Z): Claimed the local-first Pages workspace goal. The existing viewer is a read-only manifest shell, so this pass adds a browser-owned workspace repository and shared workspace navigation while retaining bundled examples and the extension's host-backed data source.
- **codex** (2026-09-10T21:10:30.000Z): Completed the local-first PWA, versioned IndexedDB workspaces, polished switcher/manager, resilient multi-file import, install/offline shell, native VS Code file context actions and isolated extension development host. Exact gate `bun run typecheck && bun run lint && bun run test` is green: 243 unit tests and 20 Playwright tests. The separate real VS Code Extension Host integration test passes, the VSIX packages with only current ESM output, and the final clean-code review has no marker above 0.5.
