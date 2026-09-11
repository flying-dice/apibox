---
column: backlog
labels: [ui]
priority: low
package: ui
updatedAt: 2026-09-11T15:00:00.000Z
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

- [ ] Confirm the duplication across all four formats, with screenshots
- [ ] Decide which of the two lines earns its place
- [ ] Fix in the shared organism; check no renderer regressions
- [ ] Update affected component tests
