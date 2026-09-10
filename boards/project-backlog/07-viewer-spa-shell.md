---
column: review
labels: [viewer]
priority: high
package: viewer
agent: codex
live: false
updatedAt: 2026-09-10T17:50:06.000Z
---
# Viewer SPA shell

A plain Svelte 5 + Vite SPA — no SvelteKit. Deliberately thin: hash routing, data
source selection, layout, search, scroll-spy. All visuals come from `@apibox/ui`.

This one bundle is both the VS Code webview and the static site; only the `DataSource`
implementation differs. Routing is hash-based so it works on GitHub Pages and inside a
webview with no server. See decisions/03-cli-ships-a-prebuilt-shell.md.

## Checklist

- [x] `DataSource` interface with static and webview implementations
- [x] Hash router (`#/<docId>/<sectionId>`)
- [x] Sidebar navigation, search, scroll-spy
- [x] `build:web` → `dist/` and `build:webview` → `dist-webview/` (CSP-safe)
- [x] Browser-level theme test: switch `data-apibox-theme` on a live page and assert the
      computed `--apibox-*` values, plus a fixture supplying VS Code variables to prove the
      webview path. Deferred here from card 03 because it needs a real browser — jsdom does
      not implement `var()` substitution.
- [x] SSR render and hydration coverage for the component library

## Comments

- **codex** (2026-09-10T16:58:00.000Z): Claimed the shared viewer shell after the OpenAPI renderer entered Review. Starting with the package boundary and existing decisions so the browser and VS Code builds share one application rather than growing separate UI paths.
- **codex** (2026-09-10T17:50:06.000Z): Moved to Review. The shared `DataSource` contract lives in `packages/viewer/src/data-source.ts`; static and correlated, runtime-validated webview implementations share the same manifest and document model. Hash routing, search, recursive sidebar navigation and scroll-spy are wired through `App.svelte`. Both `dist/` and stable-named CSP-safe `dist-webview/` builds pass. The full Review gate is green: typecheck, lint, 73 core + 132 UI + 16 viewer tests (221 total), zero clean-code markers above 0.5, and an independent boundary re-check found no remaining issue above 0.5. Live-browser verification produced dark `#ccc` on `#1f1f1f`, light `#3b3b3b` on `#fff`, and the webview fixture propagated VS Code `#123456`/`#f0e0d0` variables exactly; SSR and client hydration are covered in `packages/viewer/src/ssr.test.ts`.
