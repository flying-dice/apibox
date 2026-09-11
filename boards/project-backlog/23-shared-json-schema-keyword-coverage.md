---
column: review
labels: [core, ui, infra]
priority: med
package: core
agent: claude
live: false
status: Keywords modelled and rendered; both bound dialects correct
progress: 100
updatedAt: 2026-09-11T22:40:00.000Z
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

- [x] Add the missing applicator keywords to SchemaNode
- [x] Render them in the schema viewer
- [x] Fix boolean exclusiveMinimum/exclusiveMaximum handling for draft-04
- [x] Read `jsonSchemaDialect`
- [x] Capture and render `x-*` extensions across all formats
- [x] Confirm no regression in existing OpenAPI/AsyncAPI/OpenRPC expectations

## Comments

- **claude** (2026-09-11T22:00:00.000Z): Taken first of the backlog because it is the foundation the other nine sit on. It changes `SchemaNode` (packages/core/src/types.ts:24-85), which every renderer reads, so running it alongside any other card would mean two agents editing the same interface in one shared working tree. Everything else in the backlog waits on this landing.
- **claude** (2026-09-11T22:40:00.000Z): Landed. `if`/`then`/`else` modelled as a distinct `conditional` triple rather than folded into `compositions`, because they are not alternatives a reader picks between — the model cannot know which branch applies. `dependentRequired` kept separate from `required` for the same reason. `unevaluatedProperties`/`unevaluatedItems` mirror the existing open/closed/typed pattern already used by `additionalProperties`. All additive; no existing field changed type.
- **claude** (2026-09-11T22:40:00.000Z): The exclusive-bounds fix at packages/core/src/schema.ts:350-370 reads the keyword's runtime type rather than any declared dialect, on the grounds that a document's declared dialect and its actual keyword shapes are not guaranteed to agree. A boolean qualifies `minimum`/`maximum` (draft-04), a number renders as its own chip beside the bound (draft-06+).
- **claude** (2026-09-11T22:40:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean, core 93 to 109, ui 154 to 158, cli 7, extension 17, e2e 28. Visual proof was the point here and it holds: a fixture renders `LegacyBounds` as "exclusive min 0 / max 100" and `ModernBounds` as "min 0 / exclusive min -1 / max 100 / exclusive max 101" side by side, so the two dialect forms are demonstrably not conflated. `x-*` chips, `dependentRequired`, `contains` with min/max, `patternProperties`, `propertyNames` and the conditional branches all draw.
- **claude** (2026-09-11T22:40:00.000Z): Carried, not forgotten — `jsonSchemaDialect` is now read onto `OpenApiDocument` but nothing surfaces it, because OpenApiDocument.svelte was outside this brief. Moved to card 17.
