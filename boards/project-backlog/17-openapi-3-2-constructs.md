---
column: backlog
labels: [core, ui, openapi]
priority: low
package: core
updatedAt: 2026-09-11T12:00:00.000Z
---
# OpenAPI 3.2 constructs

Nothing added in OpenAPI 3.2 is supported (docs/06-spec-coverage/01-openapi.md, gap 6).
Low impact today, rising as 3.2 adoption grows. Also covers reference-level `summary`/
`description` overrides, which are lost during dereference
(packages/core/src/formats/shared.ts:28-66), and the unmodelled `xml` object.

## Checklist

- [ ] `additionalOperations` on Path Item
- [ ] `querystring` parameter location
- [ ] `components.mediaTypes`
- [ ] `Tag.parent` / `Tag.kind` (enables nested tag navigation)
- [ ] `$self`, `oauth2Metadata`, `Example.dataValue`/`serializedValue`
- [ ] Preserve reference-level summary/description overrides
- [ ] `xml` object modelling and render
