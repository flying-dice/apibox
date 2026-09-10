---
column: review
labels: [cli]
priority: high
package: cli
agent: codex
live: false
updatedAt: 2026-09-10T18:02:04.000Z
---
# CLI static site generator

`apibox build <inputs...> --out ./site`. Inputs are files, globs or URLs; the CLI
normalises each with `@apibox/core`, writes `data/<id>.json` plus a manifest, and copies
the prebuilt viewer shell. No build toolchain runs on the user's machine, which is what
keeps `bunx` at roughly a second. See decisions/03-cli-ships-a-prebuilt-shell.md.

## Checklist

- [x] `build` command with glob/URL inputs, `--out`, `--title`, `--base`
- [x] Manifest emission and asset copy with `<base href>` rewriting
- [x] `init` command scaffolding `apibox.config.ts`
- [x] `bin/apibox.mjs` at the repo root
- [x] Tests: build the examples, assert the output tree

## Comments

- **codex** (2026-09-10T17:50:06.000Z): Claimed after the viewer shell entered Review. Starting from the existing CLI and packaging decisions, then implementing the build pipeline around the prebuilt viewer rather than invoking Vite on the user's machine.
- **codex** (2026-09-10T18:02:04.000Z): Moved to Review. `packages/cli` now expands file/glob/URL inputs, normalises them through core, emits a versioned manifest and document JSON, copies the committed viewer, and rewrites its explicit title/base template markers. `apibox init` creates a typed, non-overwriting config which `build` discovers and merges with CLI overrides; the executable is published at `bin/apibox.mjs`. The Review gate is green at 226 tests total, zero clean-code markers above 0.5, full workspace builds, five focused CLI tests, direct command smoke tests for relative and absolute globs, and an npm dry-run confirming the executable, CLI metadata/dist and viewer assets are in the package.
