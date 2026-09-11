---
column: review
labels: [core, ui, openapi]
priority: low
package: core
agent: claude
live: false
status: 3.2 constructs and xml landed; gap 7 was a false alarm
progress: 100
updatedAt: 2026-09-12T02:50:00.000Z
---
# OpenAPI 3.2 constructs

Nothing added in OpenAPI 3.2 is supported (docs/06-spec-coverage/01-openapi.md, gap 6).
Low impact today, rising as 3.2 adoption grows. Also covers reference-level `summary`/
`description` overrides, which are lost during dereference
(packages/core/src/formats/shared.ts:28-66), and the unmodelled `xml` object.

## Checklist

- [x] `additionalOperations` on Path Item
- [x] `querystring` parameter location
- [x] `components.mediaTypes`
- [x] `Tag.parent` / `Tag.kind` (enables nested tag navigation)
- [x] `$self`, `oauth2Metadata`, `Example.dataValue`/`serializedValue`
- [x] Preserve reference-level summary/description overrides
- [x] `xml` object modelling and render
- [x] Surface `jsonSchemaDialect` in the document header (parsed by card 23, not yet rendered)

## Comments

- **claude** (2026-09-12T02:50:00.000Z): Last of the OpenAPI cards. Lower present-day impact than 15 and 16 — most of this is 3.2 constructs few documents use yet — but it also carries two things that bite today: reference-level summary/description overrides lost during dereference, and the `jsonSchemaDialect` carried over from card 23, parsed but never shown.
- **claude** (2026-09-12T03:20:00.000Z): Landed. `additionalOperations`, `querystring`, `Tag.parent`/`kind`, `$self`, `oauth2Metadata` and `Example.dataValue`/`serializedValue` are parsed; `components.mediaTypes` needed no code at all, proven by a test that a `$ref` into it resolves like every other component map. `xml` sits on `SchemaNode` and draws a single chip only when a schema actually declared it, so a JSON-only API looks exactly as it did. `jsonSchemaDialect` and `$self` now render in the header, styled to match how JsonSchemaDocument shows its dialect and schemaId — the same idea should not look like two features.
- **claude** (2026-09-12T03:20:00.000Z): **The assessment was wrong about gap 7.** Reference-level `summary`/`description` overrides are not lost — `@apidevtools/json-schema-ref-parser` v16 already implements extended references, merging a `$ref`'s siblings into a fresh copy of the target per use site. A custom preservation layer was built, then found to be redundant and actively harmful (double-processing the merge desynchronises object identity for self-referential schemas), and reverted in full. `git diff` on packages/core/src/formats/shared.ts is empty, which is the proof that AsyncAPI and OpenRPC are untouched. Tests now pin the native behaviour, including that an override does not leak between use sites. docs/06-spec-coverage/01-openapi.md has been corrected.
- **claude** (2026-09-12T03:20:00.000Z): Nested tag navigation deliberately NOT built. `Tag.parent` and `kind` are parsed, but restructuring `buildNav` and `itemsByNavigation` into multi-level trees is materially larger than modelling two fields, and the brief said to stop rather than half-build it. Navigation still groups by an operation's first tag, flat, as before.
- **claude** (2026-09-12T03:20:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 139 files, core 149 to 161, ui 169 to 176, cli 7, extension 17, viewer 20, e2e 28.
