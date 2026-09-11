---
column: backlog
labels: [core, ui, openapi]
priority: med
package: core
updatedAt: 2026-09-11T12:00:00.000Z
---
# OpenAPI: links, callbacks and multipart encoding

Three whole OpenAPI features are dropped at parse time and therefore invisible
(docs/06-spec-coverage/01-openapi.md, gaps 3 and 4).

Response `links` and operation `callbacks` have no representation in the normalised
model. `encoding` on multipart request bodies is discarded
(packages/core/src/formats/openapi/index.ts:347-358), so a multipart upload renders without
its per-part content types.

## Checklist

- [ ] Model and parse response `links`
- [ ] Model and parse operation `callbacks`
- [ ] Parse `encoding` on media types
- [ ] Render each of the three
- [ ] Tests
