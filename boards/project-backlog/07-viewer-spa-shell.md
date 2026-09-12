---
column: review
labels: [viewer]
priority: high
package: viewer
agent: codex
live: false
updatedAt: 2026-09-11T00:10:05.000Z
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

## Gates

- [x] tests-passing — typecheck and lint are clean; 247 unit tests and 21 Playwright
      scenarios pass (268 total).
- [x] clean-code-review — zero `TODO: clean-code` markers above 0.5 and no diff
      whitespace errors.
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T16:58:00.000Z): Claimed the shared viewer shell after the OpenAPI renderer entered Review. Starting with the package boundary and existing decisions so the browser and VS Code builds share one application rather than growing separate UI paths.
- **codex** (2026-09-10T17:50:06.000Z): Moved to Review. The shared `DataSource` contract lives in `packages/viewer/src/data-source.ts`; static and correlated, runtime-validated webview implementations share the same manifest and document model. Hash routing, search, recursive sidebar navigation and scroll-spy are wired through `App.svelte`. Both `dist/` and stable-named CSP-safe `dist-webview/` builds pass. The full Review gate is green: typecheck, lint, 73 core + 132 UI + 16 viewer tests (221 total), zero clean-code markers above 0.5, and an independent boundary re-check found no remaining issue above 0.5. Live-browser verification produced dark `#ccc` on `#1f1f1f`, light `#3b3b3b` on `#fff`, and the webview fixture propagated VS Code `#123456`/`#f0e0d0` variables exactly; SSR and client hydration are covered in `packages/viewer/src/ssr.test.ts`.
- **codex** (2026-09-11T00:08:00.000Z): Reopened the shell card after desktop screenshots showed the navigation and on-page surfaces ending at their content height in packages/ui/src/templates/DocLayout.svelte:37-58. Making both rails fill the viewport with independent overflow while preserving the stacked mobile layout, then adding browser geometry coverage.
- **codex** (2026-09-11T00:10:05.000Z): Returned to Review. The shared layout now uses the dynamic viewport height for its minimum canvas and both sticky rails at packages/ui/src/templates/DocLayout.svelte:27-50, while the narrow layout explicitly restores content height at lines 75-88. The browser regression at tests/e2e/viewer.spec.ts:15-27 measures both rails at 1440×900 and requires each to begin at y=0 and equal the 900px viewport. A 1440×1000 production-preview capture visually confirmed continuous navigation surfaces to the bottom edge. Typecheck, lint, 247 unit tests and 21 Playwright scenarios pass; the clean-code marker and whitespace gates are clean.

- **claude** (2026-09-12T04:20:00.000Z): **Superseded in part — this card's text no longer describes the code.** It claims desktop navigation and on-page rails fill the dynamic viewport, and its geometry guard asserted both rails at `y === 0` with `height === viewport.height`. Card 28 removed the on-page rail from the viewer entirely as duplication of the sidebar, and made the sidebar a content-height floating card. The guard was rewritten accordingly at tests/e2e/viewer.spec.ts. `DocLayout` still supports a `rightRail` prop, exercised by Storybook and the harness, so the capability survives even though the viewer no longer passes one. Read this card as history, not as current behaviour, before signing it off.
