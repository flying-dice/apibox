---
column: review
labels: [ui]
priority: high
package: ui
agent: claude
live: false
status: Rows flattened 90px to 36px; scroll-spy rewritten
progress: 100
updatedAt: 2026-09-11T18:40:00.000Z
---
# Flatten item surfaces for density

The collapsible item boxes from card 29 are too heavy. A collapsed row showing one line of
text costs roughly 90px: `padding: var(--apibox-space-5)` (16px all round) plus a raised
background, a 1px border and a 6px radius, and then the renderer adds another 16px gap
between each card. Stacked up, a wall of chrome around very little content — the opposite of
the data-dense reading this project is for.

## Decision

Drop the raised card surface entirely, **collapsed and expanded alike**. Items become flat
rows separated by hairlines, like a table. Expanded content indents beneath its own row
rather than opening a panel.

Rejected: keeping tight boxes, and keeping a surface only for the expanded state. The surface
was carrying no information either way.

Accepted risk: with several items expanded at once, the boundary between one item and the
next is carried only by a hairline and indentation. If that proves hard to read, the answer is
stronger row separation, not the return of the card.

## Checklist

- [x] Flat rows in CollapsibleCard, no background, border or radius
- [x] Hairline separators between rows; none after the last
- [x] Expanded content indents beneath its row
- [x] Collapsed row is a single tight line
- [x] Group gaps in the four renderers collapse so rows sit flush
- [x] Hover and focus-visible affordances survive without a surface

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-11T18:40:00.000Z): Implemented by Lead directly. The delegated agent was blocked by the repo's background-isolation write guard, and its suggested remedies did not fit: a worktree branches from committed HEAD, which contains neither card 29's untracked CollapsibleCard.svelte nor the user's dirty in-flight work, and disabling the guard in .claude/settings.json is not a change to make unasked.
- **claude** (2026-09-11T18:40:00.000Z): Collapsed row height measured in a real browser: **90px to 36px**. packages/ui/src/molecules/CollapsibleCard.svelte drops background, border box and radius for `padding: var(--apibox-space-2) 0`; expanded content reuses SchemaNodeRow's `.children` indent idiom (padding-left + margin-left + border-left, all `--apibox-space-4`) so the document has one disclosure language rather than two. Inter-card gaps zeroed in the four renderers and SchemaCatalog, with the heading spacing moved onto the headings themselves so only the rows sit flush.
- **claude** (2026-09-11T18:40:00.000Z): Caught a silent CSS no-op by measuring instead of eyeballing. The first attempt used `.card + .card` for the hairline; Svelte prunes that as an unused selector, because each instance of the component renders exactly one `.card` so a sibling combinator can never match inside its own markup. It compiled, linted and tested clean while drawing nothing — confirmed via `getComputedStyle` returning `borderTopWidth: 0px`. Replaced with `.card` plus `.card:first-of-type { border-top: 0 }`, verified as 0px on the first row and 1px on the next.
- **claude** (2026-09-11T18:40:00.000Z): Also worth recording: the CLI ships a prebuilt shell, so `bun packages/cli/src/dev.ts build` serves stale viewer assets. UI changes are invisible in a generated site until `bun run build && bun run sync-viewer`. This briefly made a working fix look broken.
