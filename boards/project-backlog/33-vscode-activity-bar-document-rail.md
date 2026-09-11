---
column: review
labels: [extension]
priority: high
package: extension
agent: claude
live: false
status: Icon deletion fixed; still needs a look in VS Code
progress: 90
updatedAt: 2026-09-11T21:10:00.000Z
---
# VS Code activity bar rail listing detected documents

The extension contributes a custom editor and three commands, but nothing in the activity
bar. Finding an API document today means knowing which file it is and right-clicking it.

Add an APIBox rail item containing a native VS Code tree of the workspace's detected
documents, grouped by format. Selecting one opens the existing APIBox preview.

## Decisions

- **Documents only, no section nesting.** The tree lists files grouped by format; navigation
  within a document stays in the preview, where it already works. Nothing needs parsing
  beyond format detection.
- **Configurable globs** — `apibox.include` and `apibox.exclude` settings with defaults that
  work with no configuration, so a large monorepo can narrow the scan.
- Detection is content-based, as everywhere else: a file appears only if `detectFormat`
  recognises it, so `package.json` and `tsconfig.json` never show up.

## Checklist

- [x] `viewsContainers.activitybar` entry with an icon, plus the tree view
- [x] Detection and grouping in a vscode-free module so it is unit testable
- [x] Cheap textual prefilter before parsing any candidate
- [x] `apibox.include` / `apibox.exclude` settings, documented
- [x] Tree refreshes as workspace files change
- [x] Selecting a document opens the APIBox preview
- [x] Empty state when nothing is detected

## Comments

- **claude** (2026-09-11T20:40:00.000Z): Shipped. Detection, filtering and grouping live in packages/extension/src/document-index.ts, which does not import `vscode` and is therefore reachable by the fast vitest suite; packages/extension/src/document-tree.ts is a thin TreeDataProvider over it, talking only to `vscode.workspace` for globbing, reading, watching and settings. The document tree item invokes the existing `apibox.preview` command rather than duplicating how a preview is opened.
- **claude** (2026-09-11T20:40:00.000Z): Verified myself — typecheck 10x "0 ERRORS", biome clean over 136 files, extension build succeeds, and the full suite is green at core 93 / ui 154 / cli 7 / extension 14 (was 4) / e2e 28. The load-bearing test is the false-positive corpus at packages/extension/src/document-index.test.ts:68-84, which feeds the repo's own package.json, tsconfig.base.json, biome.json and .github/workflows/ci.yml through the index and requires an empty result, so the rail cannot fill up with ordinary config files.
- **claude** (2026-09-11T20:40:00.000Z): Fixed a disposable leak the implementing agent found and left. `setupWatcher` disposed the old watcher but kept pushing four fresh disposables onto the shared subscriptions array, so repeatedly editing the include globs grew it without bound. Watcher disposables now live in their own list that is emptied each time it is rebuilt.
- **claude** (2026-09-11T20:40:00.000Z): Held at 90% rather than marked complete, because nothing here has been seen in a running VS Code window — no GUI was available. Unverified: the activity bar icon rendering and recolouring at 24px, the tree's grouping and expand state, the viewsWelcome empty state, and that clicking an item actually opens the preview end to end. The command wiring matches the existing `previewActiveDocument(resource?: vscode.Uri)` signature by inspection only. `bun run dev:extension` is the check.
- **claude** (2026-09-11T21:10:00.000Z): User ran `bun run dev:extension` and saw no activity bar icon. Root cause was not rendering — the file was gone. packages/extension/scripts/sync-assets.mjs maps the built webview into `media/`, and scripts/sync-asset-directories.mjs removes the destination outright before renaming the staged copy in, so `media/` is replaced wholesale. `dev:watch` runs `sync-assets` before every build, so the icon was deleted on the first run after it was committed. It passed review, typecheck, lint and 28 e2e tests while being deleted by the very command used to try it.
- **claude** (2026-09-11T21:10:00.000Z): Moved the icon to packages/extension/icons/activity-bar.svg — hand-authored assets must not live in a machine-owned directory — pointed the contribution at it, and added `icons` to the package `files` array so the VSIX still carries it. Added a comment at the top of sync-assets.mjs naming both wiped destinations, because nothing in that script said so.
- **claude** (2026-09-11T21:10:00.000Z): Guarded at packages/extension/src/contributions.test.ts: every asset path contributed by package.json must exist on disk and must not sit inside a directory the build wipes, plus a check that the path list is non-empty so the other two cannot pass vacuously. Proven by regression — pointing the icon back at `media/` fails 2 tests; restored, 17 pass. Also confirmed directly that the icon now survives both `sync-assets` and a full build.
