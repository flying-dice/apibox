---
column: review
labels: [ui, viewer]
priority: high
package: ui
agent: claude
live: false
status: Collapsing works; surfaces too heavy, see card 30
progress: 100
updatedAt: 2026-09-11T17:40:00.000Z
---
# Collapsible item cards, collapsed by default

Every top-level rendered item currently prints in full, so a document of any size is a wall
of text and the flat list cannot be scanned. Each item becomes a collapsed box that expands
on click, or when it is reached through the navigation or a deep link.

Applies to every item that has an `id` matching a navigation entry — which is exactly the set
a reader can navigate to:

- `packages/ui/src/organisms/OperationCard.svelte:22` (OpenAPI operations)
- `packages/ui/src/renderers/jsonrpc/RpcMethodCard.svelte:15` (JSON-RPC methods)
- `packages/ui/src/renderers/asyncapi/AsyncApiOperationCard.svelte:15` (AsyncAPI operations)
- `packages/ui/src/organisms/SchemaCatalog.svelte:24` (schema entries, all four formats)

`AsyncApiMessage.svelte` is nested inside an operation card and has no nav id, so it is not a
box of its own.

## Decisions

- **Independent toggling**, not an accordion. Opening one leaves the others as they are, so
  two items can be compared and nothing collapses above the reader's scroll position.
- **Schema entries are included**, even though they already own an inner expand/collapse tree.
  Accepted cost: two interactions to read one schema.
- Collapsed content stays **in the DOM**, hidden rather than removed — so browser find-in-page
  still reaches it and the testid coverage guard is not silently weakened.

## Checklist

- [x] Shared collapsible primitive, collapsed by default, keyboard accessible
- [x] Applied to all four item types above
- [x] Expands when reached via navigation click
- [x] Expands when reached via a deep link on first load
- [x] Expands when browser find-in-page matches hidden content
- [x] Scroll-spy still highlights the right nav entry with everything collapsed
- [x] Existing tests updated to expand before asserting inner content

## Comments

- **claude** (2026-09-11T17:40:00.000Z): Landed as packages/ui/src/molecules/CollapsibleCard.svelte, applied to the four navigable item types. Collapsed content stays in the DOM behind `hidden="until-found"` with a `beforematch` handler rather than being removed by an `{#if}` — removing it would not have failed the testid guard in tests/e2e/coverage.ts, it would have silently shrunk what that guard checks, and it would have put the content beyond browser find-in-page.
- **claude** (2026-09-11T17:40:00.000Z): Verified independently — the implementing agent's report never reached me, so rather than relay it I read the code and ran the suite myself: typecheck 10x "0 ERRORS", biome clean, core 93, ui 148 to 154, e2e 23 to 28. Confirmed the agent had finished before building on its work by checking no file had changed in 40 minutes, its server was down and all three required screenshots existed.
- **claude** (2026-09-11T17:40:00.000Z): Presentation rejected on review. The user, looking at the result in the Extension Development Host: "the surfaces are to large messing up the data dense design". A collapsed row showing one line of text cost about 90px — `--apibox-space-5` padding all round plus a raised background, border and radius, then another 12-16px gap added by each renderer. The behaviour is right and stays; the surface is being removed in card 30.
