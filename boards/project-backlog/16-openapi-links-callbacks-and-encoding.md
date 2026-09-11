---
column: review
labels: [core, ui, openapi]
priority: med
package: core
agent: claude
live: false
status: Links, callbacks and encoding parsed and rendered
progress: 100
updatedAt: 2026-09-12T02:20:00.000Z
---
# OpenAPI: links, callbacks and multipart encoding

Three whole OpenAPI features are dropped at parse time and therefore invisible
(docs/06-spec-coverage/01-openapi.md, gaps 3 and 4).

Response `links` and operation `callbacks` have no representation in the normalised
model. `encoding` on multipart request bodies is discarded
(packages/core/src/formats/openapi/index.ts:347-358), so a multipart upload renders without
its per-part content types.

## Checklist

- [x] Model and parse response `links`
- [x] Model and parse operation `callbacks`
- [x] Parse `encoding` on media types
- [x] Render each of the three
- [x] Tests

## Comments

- **claude** (2026-09-12T02:20:00.000Z): Taken ahead of card 17 because these are three whole OpenAPI features dropped at parse time, where 17 is mostly newer constructs with lower present-day impact. Sequenced alone: like every remaining card it adds to packages/core/src/types.ts, which no two agents can edit at once in this shared tree.
- **claude** (2026-09-12T02:45:00.000Z): All three landed and render. `ResponseLink` kept distinct from card 22's `RpcLink` rather than shared — OpenAPI links carry `operationId`/`operationRef` and a `requestBody` that OpenRPC's has no equivalent for — but the per-parameter `{name, value}` shape deliberately mirrors it, since both must preserve unevaluated runtime expressions verbatim. `MediaTypeEncoding.style`/`explode` reuse card 15's `{value, declared}` precedent.
- **claude** (2026-09-12T02:45:00.000Z): Callback recursion is bounded by construction rather than by counting depth. `Callback.operations` reuses `Operation`, but the parser reads `callbacks` only on a top-level path operation and never on an operation already inside one, so the field is architecturally `undefined` at the second level. A test asserts a callback declaring its own `callbacks` does not propagate them, and another that a self-referential schema inside a callback does not hang.
- **claude** (2026-09-12T02:45:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 139 files, core 141 to 149, ui 166 to 169, cli 7, extension 17, viewer 20, e2e 28 (rerun after the shared petstore.yaml fixture changed). Screenshot confirms the encoding chip, the `GetCreatedPet → getPet` link with its `$response.body#/id` parameter, and the `onStatusChange` callback whose nested POST stays a collapsed row rather than expanding into the page. OpenAPI parse coverage moves from roughly 45% to the mid-50s.
