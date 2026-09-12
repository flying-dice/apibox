---
column: review
labels: [ui, core, infra]
priority: high
package: ui
agent: claude
live: false
status: Schema examples render in all four formats
progress: 100
updatedAt: 2026-09-12T07:10:00.000Z
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

- [x] Render `SchemaNode.examples` on the owning row
- [x] Respect density — cards 29/30 flattened this UI deliberately; several examples on one
      property must not balloon the row
- [x] Distinguish a schema-level example from the operation-level examples `ExampleViewer`
      already renders, so the two do not read as duplicates
- [x] Confirm it draws in all four formats, with a screenshot of each
- [x] A test per format asserting the example reaches the DOM

## Comments

- **claude** (2026-09-12T07:40:00.000Z): Fixed by rendering examples as a labelled chip group on the owning row, reusing the `enum` idiom exactly rather than inventing a third way to show values. Long values truncate at 60 characters with the full value on a native title tooltip, so a large object example cannot blow up a row. Cost is zero to one wrapped chip line — the same as adding one more enum value.
- **claude** (2026-09-12T07:40:00.000Z): A second instance of the same bug was found while verifying, unprompted: `showRoot` in SchemaViewer did not consider `examples`, so a root schema whose only distinguishing feature was an example never got a row at all and its example vanished exactly as before. That case is now covered, which matters most for JSON Schema `$defs` entries.
- **claude** (2026-09-12T07:40:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 140 files, core 181, ui 188 to 197, cli 7, extension 17, viewer 20, e2e 28, no existing test modified. Screenshots confirm the requirement that mattered: on Create a pet, the schema-level `example "Rex"` chip sits inline beside `min length 1` on the `name` property while the operation-level Minimal pet example remains a separate boxed block below, so the two do not read as the same thing twice.
