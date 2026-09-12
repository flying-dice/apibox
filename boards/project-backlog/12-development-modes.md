---
column: review
labels: [infra]
priority: high
package: root
agent: codex
live: false
updatedAt: 2026-09-10T18:45:26.000Z
---
# Development modes for every runnable unit

Give each workspace package an explicit `dev` script and expose the runnable surfaces from
the repository root so contributors do not need to know package-specific commands.

## Checklist

- [x] Browser viewer and UI workbench have development servers
- [x] CLI runs directly from TypeScript source
- [x] VS Code extension has a watch build connected to F5
- [x] Core library has a compiler watch loop
- [x] Root commands and contributor documentation describe every mode

## Gates

- [x] tests-passing — typecheck and lint clean, 232 tests passed, all workspace builds passed (codex, 2026-09-10T18:45:26Z)
- [x] clean-code-review — proportional review found no remaining marker above 0.5 (codex, 2026-09-10T18:45:26Z)
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T18:33:20.000Z): Claimed this cross-workspace developer-experience request. Inventory found runnable entry points for the viewer, UI workbench, CLI and extension; the core package also needs a watch loop because all of those surfaces consume it.
- **codex** (2026-09-10T18:45:26.000Z): Completed root entry points in package.json:27-32 and documented the command matrix in docs/01-overview.md:36-52. Each package now owns a local development mode; the CLI source entry is packages/cli/src/dev.ts:1, and the extension watcher validates its flags and reports F5 readiness in packages/extension/scripts/build.mjs:3-31 with the background task wired at .vscode/tasks.json:11-28. Smoke-tested every mode, ran the full 232-test gate and all builds, then resolved the review's command-boundary naming and expected-error findings.
