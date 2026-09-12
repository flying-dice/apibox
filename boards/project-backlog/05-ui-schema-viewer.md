---
column: review
labels: [ui]
priority: high
package: ui
agent: codex
live: false
updatedAt: 2026-09-10T23:23:00.000Z
---
# SchemaViewer organism

The single most reused component in the project: one recursive schema renderer serving
OpenAPI request/response bodies, AsyncAPI message payloads and JSON-RPC params alike,
because all three normalise to the same `SchemaNode` tree.

Build this before anything that depends on it. It has to handle expand/collapse,
required and deprecated markers, constraint chips, enums, composition (`oneOf`/`anyOf`/
`allOf`), and — critically — stop at `circularRef` nodes and offer a link instead of
descending.

## Checklist

- [x] Recursive property tree with expand/collapse
- [x] Constraint chips, enum values, defaults, examples
- [x] Composition rendering
- [x] Circular reference handling (must not recurse)
- [x] Stories covering a deep object, an array of refs, a `oneOf`, and the recursive `Pet`

## Gates

- [x] tests-passing — workspace typecheck and lint clean; 69 core + 123 UI tests green (codex, 2026-09-10T16:30:50.000Z)
- [x] clean-code-review — eight-principle audit complete with no marker above 0.5 (codex, 2026-09-10T16:30:50.000Z)
- [x] tests-passing — typecheck and lint clean; 243 unit + 20 Playwright tests green, including disclosure geometry (codex, 2026-09-10T23:23:00Z)
- [x] clean-code-review — marker gate reports zero findings above 0.5 (codex, 2026-09-10T23:23:00Z)
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T16:17:59.000Z): Resumed the interrupted SchemaViewer review work at packages/ui/src/organisms/SchemaViewer.svelte:1, repaired the duplicate import, bound global depth and width overrides to schema identity, and added replacement-state regressions in packages/ui/src/organisms/SchemaViewer.test.ts:176. The focused organism suite is green at 34 tests and Svelte reports no diagnostics; full gates and the required external review remain.
- **codex** (2026-09-10T16:30:50.000Z): Centralised root and nested width limiting through the recursive row at packages/ui/src/organisms/SchemaNodeRow.svelte:22-134, kept toolbar overrides schema-scoped at packages/ui/src/organisms/SchemaViewer.svelte:51-109, and completed the required story set at packages/ui/src/organisms/SchemaViewer.stories.svelte:22-137. Removed the internal row from the public package API at packages/ui/src/index.ts:30. All local gates and the Storybook production build pass; the external review gate requires explicit authorization to send scoped source to Antigravity/Gemini.
- **codex** (2026-09-10T16:35:27.000Z): Removed the Antigravity entry gate from boards/project-backlog/.config.json:20 at the user's direction. The remaining test and clean-code gates are satisfied, so this card is ready for human review.
- **codex** (2026-09-10T23:20:00.000Z): Reopened the card after the disclosure arrows were reported visually detached from their property headers in packages/ui/src/organisms/SchemaNodeRow.svelte:68-96. Reproducing the expanded and collapsed geometry before applying the layout correction.
- **codex** (2026-09-10T23:23:00.000Z): Aligned each disclosure wrapper with the property row's top inset at packages/ui/src/organisms/SchemaNodeRow.svelte:69-160 and added an expanded/collapsed browser geometry regression at tests/e2e/formats.spec.ts:73-89. The icon and property-name centres stay within one CSS pixel; the full Review gate passes, so the card has returned to Review.
