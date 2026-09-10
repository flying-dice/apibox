---
column: review
labels: [ui]
priority: high
package: ui
agent: codex
live: false
updatedAt: 2026-09-10T16:35:27.000Z
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

## Comments

- **codex** (2026-09-10T16:17:59.000Z): Resumed the interrupted SchemaViewer review work at packages/ui/src/organisms/SchemaViewer.svelte:1, repaired the duplicate import, bound global depth and width overrides to schema identity, and added replacement-state regressions in packages/ui/src/organisms/SchemaViewer.test.ts:176. The focused organism suite is green at 34 tests and Svelte reports no diagnostics; full gates and the required external review remain.
- **codex** (2026-09-10T16:30:50.000Z): Centralised root and nested width limiting through the recursive row at packages/ui/src/organisms/SchemaNodeRow.svelte:22-134, kept toolbar overrides schema-scoped at packages/ui/src/organisms/SchemaViewer.svelte:51-109, and completed the required story set at packages/ui/src/organisms/SchemaViewer.stories.svelte:22-137. Removed the internal row from the public package API at packages/ui/src/index.ts:30. All local gates and the Storybook production build pass; the external review gate requires explicit authorization to send scoped source to Antigravity/Gemini.
- **codex** (2026-09-10T16:35:27.000Z): Removed the Antigravity entry gate from boards/project-backlog/.config.json:20 at the user's direction. The remaining test and clean-code gates are satisfied, so this card is ready for human review.
