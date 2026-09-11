---
column: review
labels: [ui]
priority: low
package: ui
agent: claude
live: false
status: Fixed at the source — self-referential refName
progress: 100
updatedAt: 2026-09-12T00:40:00.000Z
---
# Schema catalog prints each schema name twice

In the Schemas/Definitions section every entry renders its name as the card heading and then
again immediately beneath it as the type-summary line — "Address" followed by "Address".

Found while reviewing a real browser render of a JSON Schema document, but this is **not**
JSON-Schema-specific: packages/ui/src/organisms/SchemaCatalog.svelte:28 renders
`schema.name ?? schema.title` as an `h3`, and the `SchemaViewer` it wraps then renders its own
type label, which for a named component schema resolves to the same name. That path is shared
by all four renderers, so OpenAPI and AsyncAPI schema catalogues have it too.

Deliberately left out of the JSON Schema cards (24-26) — changing it there would have altered
OpenAPI's rendering off the back of a JSON Schema ticket.

## Checklist

- [x] Confirm the duplication across all four formats, with screenshots
- [x] Decide which of the two lines earns its place
- [x] Fix in the shared organism; check no renderer regressions
- [x] Update affected component tests

## Comments

- **claude** (2026-09-12T00:40:00.000Z): Running in parallel with the other of cards 22 and 27. They are the only two remaining pieces with genuinely disjoint files — 22 is the OpenRPC parser, its model types and the jsonrpc renderer; 27 is the shared schema catalog and viewer organisms. Everything else in the backlog contends on packages/core/src/types.ts and has to be sequenced.
- **claude** (2026-09-12T01:05:00.000Z): Not a UI bug after all. `normaliseSchema` takes a `names` map so an inlined `$ref` can be labelled with the component it points at, but a catalogue entry's own root object is registered in that map under its own name, and `schemaTypeLabel` (packages/core/src/schema.ts:268) returns `refName` first — so every catalogue root labelled itself. Fixed in `walk()` by suppressing `refName` only when the match is self-referential at the walk's root, leaving a nested property genuinely typed as `Address` still labelled. Tests pin both sides of that distinction.
- **claude** (2026-09-12T01:05:00.000Z): No UI change was needed once the data was correct, which is the better outcome — SchemaCatalog.svelte and SchemaViewer.svelte are untouched. The collapsed row still shows the name and stays scannable; the type line now reads "object" for an object, and real information such as "string" or "string[]" for the non-object roots where the name alone said nothing.
- **claude** (2026-09-12T01:05:00.000Z): Flagged for a separate card if it bothers anyone — `SchemaNodeRow`'s root row still prints the schema's own name beside its type (e.g. "Pet object") when a root carries a description or composition. Pre-existing, not a literal repeat of the heading, left alone.
