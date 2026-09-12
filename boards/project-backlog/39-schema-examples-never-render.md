---
column: backlog
labels: [ui, core, infra]
priority: high
package: ui
updatedAt: 2026-09-12T06:00:00.000Z
---
# Schema examples are parsed and never rendered, in every format

`normaliseSchema` collects a schema's `examples` onto `SchemaNode.examples`
(packages/core/src/schema.ts:149-150), handling both OpenAPI 3.0's singular `example` and
JSON Schema / OpenAPI 3.1's `examples` array. Nothing renders it. Verified: `SchemaNodeRow`,
`PropertyRow` and `SchemaViewer` contain no reference to `.examples` at all.

`SchemaNode` is the shared model behind all four formats, so every schema-level example in
every OpenAPI, AsyncAPI, OpenRPC and JSON Schema document is silently discarded at the point
of display. An author writes `example: "pending"` against a property and the reader never
sees it.

Found by the first JSON Schema coverage audit, which reported it as possibly cross-format.
Confirmed cross-format by grep.

This is the project's recurring failure mode in shared code: parsed correctly, tested at the
parse layer, never drawn. The parse-layer tests all pass.

## Checklist

- [ ] Render `SchemaNode.examples` on the owning row
- [ ] Respect density — cards 29/30 flattened this UI deliberately; several examples on one
      property must not balloon the row
- [ ] Distinguish a schema-level example from the operation-level examples `ExampleViewer`
      already renders, so the two do not read as duplicates
- [ ] Confirm it draws in all four formats, with a screenshot of each
- [ ] A test per format asserting the example reaches the DOM
