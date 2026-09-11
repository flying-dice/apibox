---
column: backlog
labels: [core, ui, infra]
priority: med
package: core
updatedAt: 2026-09-11T12:00:00.000Z
---
# Shared: JSON Schema keyword coverage and x-* extensions

Cross-cutting gap found independently by all three coverage assessments. `SchemaNode`
(packages/core/src/types.ts:24-85) has no representation for `if`/`then`/`else`,
`patternProperties`, `propertyNames`, `contains`/`minContains`/`maxContains`,
`dependentRequired`/`dependentSchemas` or `unevaluatedProperties`. They are dropped
silently, in every format.

Tolerable when a schema is one request body among many. Much more visible once a schema
**is** the document (see card 24), which is why this should land before or with the JSON
Schema format.

Also here: `x-*` specification extensions are recognised but never captured or rendered in
any format, and `jsonSchemaDialect` is not read.

Related bug: `toConstraints` (packages/core/src/schema.ts:248-256) stringifies blindly, so
draft-04's boolean `exclusiveMinimum` renders as the chip "exclusive min: true". Verified
by reading the function — it skips `false` and stringifies `true`.

## Checklist

- [ ] Add the missing applicator keywords to SchemaNode
- [ ] Render them in the schema viewer
- [ ] Fix boolean exclusiveMinimum/exclusiveMaximum handling for draft-04
- [ ] Read `jsonSchemaDialect`
- [ ] Capture and render `x-*` extensions across all formats
- [ ] Confirm no regression in existing OpenAPI/AsyncAPI/OpenRPC expectations
