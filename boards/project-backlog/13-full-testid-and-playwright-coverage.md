---
column: review
labels: [ui, viewer, infra]
priority: high
package: viewer
agent: codex
live: false
status: complete and verified across source, rendered output and browser workflows
progress: 100
updatedAt: 2026-09-10T19:13:53.000Z
---
# Full data-testid and Playwright coverage

Make stable test hooks a verified production contract and exercise the complete static
viewer workflow in a real browser for OpenAPI, AsyncAPI and JSON-RPC.

## Checklist

- [x] Every component, meaningful state, repeated data item and interactive element has a stable test ID
- [x] Runtime coverage rejects missing interactive hooks and duplicate IDs
- [x] Playwright builds and serves the same static output shipped by the CLI
- [x] Browser tests cover routing, navigation, search, themes, controls and failure states
- [x] Browser tests cover OpenAPI, AsyncAPI and JSON-RPC content
- [x] Unit tests use test-ID selectors consistently
- [x] Contributor docs and root scripts describe the browser suite

## Gates

- [x] tests-passing — exact board gate passed: clean typecheck/lint, 235 unit tests and 15 Playwright tests; Playwright rebuilt all packages and the CLI-generated three-format site (codex, 2026-09-10T19:13:53Z)
- [x] clean-code-review — full parallel review resolved six findings; re-review found no introduced marker above 0.5 (codex, 2026-09-10T19:13:53Z)
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T18:50:18.000Z): Claimed the session-level coverage goal after auditing the current UI. Existing packages have component-level hooks, but nine production Link usages omit IDs, card-10 renderer wrappers are incomplete, and thirteen unit assertions use text/role selectors despite the documented policy. Establishing enforceable static and runtime contracts before expanding browser behavior coverage.
- **codex** (2026-09-10T19:13:53.000Z): Completed the coverage contract. A shared policy now statically audits every production Svelte semantic/interactive element and prevents non-test-ID Testing Library selectors; Playwright independently rejects missing and duplicate hooks in the real CLI output. The 15 browser scenarios cover all three formats plus routing, navigation, filtering, keyboard clearing, themes, deep links, schema expansion, clipboard controls, loading and invalid-data states. Root `test` and CI both run the 235-unit + 15-browser suite. Full clean-code review findings were fixed and independently re-checked clean.
