---
column: doing
labels: [core, ui, asyncapi]
priority: med
package: core
agent: claude
live: false
status: PARTIAL — stopped mid-flight, needs finishing
progress: 50
updatedAt: 2026-09-11T23:55:00.000Z
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

## Comments

- **claude** (2026-09-11T23:20:00.000Z): Cards 18, 20 and 21 are being worked together by one agent. They all touch packages/core/src/formats/asyncapi/index.ts and the AsyncAPI renderer, so splitting them across agents in a shared working tree would mean three of them editing the same two files at once. Bindings (card 19) stay separate — that surface is large enough to stand alone.
- **claude** (2026-09-11T23:55:00.000Z): **Stopped mid-flight and NOT complete.** Session wound up before the agent finished. The tree was green at the checkpoint — typecheck clean, core 117 to 127, ui 165, extension 17 — so the partial work is committed as a safe resting point rather than discarded, but it must not be read as done. packages/core/src/formats/asyncapi/index.ts, packages/core/src/types.ts, examples/streetlights.asyncapi.yaml, packages/ui/src/renderers/asyncapi/* and packages/ui/src/organisms/ServerList.svelte were all being edited when it stopped.
- **claude** (2026-09-11T23:55:00.000Z): Whoever picks this up: re-read the three card bodies and docs/06-spec-coverage/02-asyncapi.md, then diff what actually landed against the checklists before writing anything. Two items were called out as mattering most — `schemaFormat`, because Avro and Protobuf payloads are currently force-walked as JSON Schema and render confidently wrong rather than absent; and the card 21 claim that AsyncAPI dereferencing bypasses the shared warning machinery, which was flagged as UNVERIFIED and must be confirmed before being acted on. Neither is known to be finished.
