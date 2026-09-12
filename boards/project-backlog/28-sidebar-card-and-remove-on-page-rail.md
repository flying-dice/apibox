---
column: review
labels: [ui, viewer]
priority: high
package: ui
agent: claude
live: false
status: Sidebar card shipped; rail removed from the viewer
progress: 100
updatedAt: 2026-09-11T16:40:00.000Z
---
# Sidebar as a content-height card; drop the on-page rail

The right-hand "On this page" rail repeats the sidebar. It renders the top-level entries of
`currentDocument.nav` (packages/viewer/src/ViewerShell.svelte:168-180), which is the same tree
`SidebarNav` already renders in the sidebar — only without children. Two rails, one set of
links.

The left sidebar also stretches to the full viewport height regardless of how little
navigation there is, which leaves a tall empty sunken column on short documents.

**This reverses part of card 07**, which is in Review and whose stated result was "Desktop
navigation and on-page rails now fill the dynamic viewport". Its geometry guard at
tests/e2e/viewer.spec.ts:16-26 asserts both rails have `y === 0` and
`height === viewport.height`. That guard is not deleted — it is rewritten to assert the new
intent, so the layout stays measured rather than unverified.

## Decisions

- The **whole left column** becomes one rounded card — brand included — floating on the page
  background at content height.
- `DocLayout`'s `rightRail` prop **stays**, along with its styles, Storybook story and
  harness. Only the viewer stops passing one. The capability survives for a future
  non-duplicating use.

## Checklist

- [x] Sidebar: rounded, sunken, content-height card with a margin; sticky on scroll
- [x] Cap its height on long navigation so it scrolls internally instead of overflowing
- [x] Remove the `rightRail` snippet from ViewerShell and its `.on-page` styles
- [x] Keep the `rightRail` prop, styles, story and harness in DocLayout
- [x] Rewrite the e2e geometry guard to assert content-height, not viewport-height
- [x] Mobile stacked layout still sane

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-11T16:40:00.000Z): Sidebar is now a floating card in packages/ui/src/templates/DocLayout.svelte, using only existing tokens: `--apibox-space-4` for margin and sticky offset, `--apibox-radius-lg` for the corners, `--apibox-border`, `--apibox-bg-sunken`. The old `border-right` was a divider between adjacent full-height columns and made no sense on a floating card, so it became a border all round. `.right-rail` kept its original full-height rule untouched, so the prop, styles, Storybook story and packages/ui/src/test/DocLayoutHarness.svelte all still work — only packages/viewer/src/ViewerShell.svelte stopped passing one.
- **claude** (2026-09-11T16:40:00.000Z): Measured in a real browser rather than trusting the diff — sidebar box `{x:12, y:12, width:248, height:365}` against a 900px viewport, computed `border-radius: 6px`, `margin: 12px`, `max-height: 876px` (viewport minus both margins), and `viewer-layout-right-rail` count 0. So it floats, it stops at content height, and it is capped for long navigation.
- **claude** (2026-09-11T16:40:00.000Z): The replaced geometry guard was never committed — it existed only in the uncommitted card 07 work, so `git` cannot restore it. Preserving its original assertions here for the record: test `'fills the desktop viewport with both navigation rails'` looped `['viewer-layout-sidebar', 'viewer-layout-right-rail']` asserting `rail.y === 0` and `rail.height === viewport.height` at 1440x900. The replacement at tests/e2e/viewer.spec.ts:16 asserts the opposite intent and was proven to be a real guard by reverting DocLayout and watching it fail on `sidebar.y` (`Expected: > 0, Received: 0`).
- **claude** (2026-09-11T16:40:00.000Z): Card 07 in Review now describes behaviour that no longer holds — its "on-page rails fill the dynamic viewport" claim is superseded. Needs its status text revisited before it moves to Done.
