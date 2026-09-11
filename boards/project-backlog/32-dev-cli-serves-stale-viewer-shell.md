---
column: review
labels: [cli, infra]
priority: high
package: cli
agent: claude
live: false
status: Dev CLI rebuilds the shell; 0.46s end to end
progress: 100
updatedAt: 2026-09-11T19:20:00.000Z
---
# Dev CLI built sites around a stale viewer shell

`bun run dev:cli -- build` copied the viewer shell committed to
`packages/cli/assets/viewer`. That directory is a build artefact written only by CI, so it
lags behind any uncommitted change to `@apibox/ui` or `@apibox/viewer`.

The result was a silent trap: a developer changes a component, generates a site to check it,
and sees the last released shell with no indication anything is stale. The change looks
broken when it is actually fine. This cost real time during cards 29 and 30 — a working
hairline fix was investigated as a failure before the stale bundle was spotted.

The published behaviour is correct and unchanged: decisions/03-cli-ships-a-prebuilt-shell.md
keeps a real user's run to file I/O with no toolchain. Only the dev entry needed fixing.

## Decision

`packages/cli/src/dev.ts` builds the viewer first and points the build at its fresh output
with a new `--asset-dir` flag. Unconditionally, not by staleness detection — the viewer web
build measured **200ms**, so guessing whether the committed assets are current costs more
complexity than it saves.

The committed assets are never written to by a dev run, which keeps them CI-owned and stops
development dirtying the working tree.

## Checklist

- [x] `--asset-dir` flag on the CLI, mapped to the existing `BuildOptions.assetDir`
- [x] Dev entry rebuilds the viewer and points at its output
- [x] `--help` and `init` stay instant
- [x] Regression tests for the flag
- [x] Documented in docs/01-overview.md and the decision record

## Comments

- **claude** (2026-09-11T19:20:00.000Z): Fixed in packages/cli/src/dev.ts, with a new `--asset-dir` flag in packages/cli/src/cli.ts mapping to the `assetDir` option `buildSite` already accepted. Chose to rebuild unconditionally after measuring the viewer web build at 200ms — a full dev build now runs end to end in 0.46s, so staleness detection would have been complexity bought for nothing. `--help` and `init` skip the rebuild entirely.
- **claude** (2026-09-11T19:20:00.000Z): Proved the fix rather than assuming it. Injected a marker string into packages/ui/src/organisms/SchemaCatalog.svelte, ran `dev:cli -- build` with no manual `bun run build && sync-viewer`, and found the marker in the generated bundle. Confirmed the same marker was absent from packages/cli/assets/viewer, so the dev run leaves the CI-owned assets untouched. Marker reverted.
- **claude** (2026-09-11T19:20:00.000Z): Consequence worth knowing — `e2e:build` now builds its site from `packages/viewer/dist` rather than the committed shell. It still runs `sync-viewer`, and sync copies that same directory, so the two are byte-identical; the copy path itself is no longer what the browser suite exercises.
