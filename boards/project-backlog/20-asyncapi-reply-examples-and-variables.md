---
column: backlog
labels: [core, ui, asyncapi]
priority: med
package: core
updatedAt: 2026-09-11T12:00:00.000Z
---
# AsyncAPI: reply, examples, server variables, multi-format schemas

Medium-severity AsyncAPI gaps (docs/06-spec-coverage/02-asyncapi.md). Two of these are
**dead UI code** — the component already renders the data, but nothing ever parses it:
message `examples` (ExampleViewer is wired and waiting) and server `variables`
(ServerList.svelte already renders them). Those are near-free wins.

Operation `reply` being dropped means the whole request/reply pattern is invisible.
`schemaFormat` not being detected is worse than an omission: Avro and Protobuf payloads
are force-walked as JSON Schema, producing a silently **wrong** render rather than an
absent one.

## Checklist

- [ ] Parse message `examples` (UI already exists)
- [ ] Parse server `variables` (UI already exists)
- [ ] Model and parse operation `reply` + `replyAddress`
- [ ] Detect `schemaFormat`; warn and skip JSON Schema walking for non-JSON-Schema payloads
- [ ] Parse operation-level `security` and `tags`
- [ ] Keep channels with zero operations in the output
- [ ] Render `info.tags` for AsyncAPI as OpenAPI already does
- [ ] Tests
