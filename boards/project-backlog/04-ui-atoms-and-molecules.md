---
column: review
labels: [ui]
priority: high
package: ui
agent: codex
live: false
updatedAt: 2026-09-10T16:35:27.000Z
---
# UI atoms and molecules

The atomic-design base layer, every component with a story.
See decisions/05-atomic-design-structure.md.

Atoms: Badge, Button, Chip, Code, Icon, Link, Pill, Spinner, Text, HttpMethod.
Molecules: CodeBlock, KeyValueRow, PropertyRow, ParameterRow, SchemaTypeLabel,
StatusRow, TabBar, SearchInput, NavItem.

## Checklist

- [x] Atoms + stories
- [x] Molecules + stories
- [x] HTTP method and status-code colour scales, checked in both themes

## Gates

- [x] tests-passing — workspace typecheck and lint clean; 69 core + 123 UI tests green (codex, 2026-09-10T16:30:50.000Z)
- [x] clean-code-review — eight-principle audit complete with no marker above 0.5 (codex, 2026-09-10T16:30:50.000Z)
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T16:30:50.000Z): Completed the interrupted UI review pass. Consolidated the public badge variant contract in packages/ui/src/atoms/Badge.svelte:4 and removed the unused PropertyRow composition surface in packages/ui/src/molecules/PropertyRow.svelte:15. Added malformed duplicate-constraint coverage at packages/ui/src/molecules/molecules.test.ts:156. Implementation is complete and locally green; the external review gate requires explicit authorization to send scoped source to Antigravity/Gemini.
- **codex** (2026-09-10T16:35:27.000Z): Removed the Antigravity entry gate from boards/project-backlog/.config.json:20 at the user's direction. The remaining test and clean-code gates are satisfied, so this card is ready for human review.
