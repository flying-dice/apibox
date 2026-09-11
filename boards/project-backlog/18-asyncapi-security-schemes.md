---
column: backlog
labels: [core, ui, asyncapi]
priority: high
package: core
updatedAt: 2026-09-11T12:00:00.000Z
---
# AsyncAPI: security schemes

AsyncAPI `components.securitySchemes` and server-level `security` are dropped entirely —
there is no field for them on `AsyncApiDocument` (docs/06-spec-coverage/02-asyncapi.md).
Verified: `grep -n security packages/core/src/formats/asyncapi/index.ts` returns zero hits.

This is cheap to close because the UI already exists: `SecuritySchemes.svelte` works today
for OpenAPI. The gap is purely in the parser and model.

## Checklist

- [ ] Add security scheme fields to the AsyncAPI document model
- [ ] Parse `components.securitySchemes` and server `security`
- [ ] Reuse SecuritySchemes.svelte in the AsyncAPI renderer
- [ ] Tests
