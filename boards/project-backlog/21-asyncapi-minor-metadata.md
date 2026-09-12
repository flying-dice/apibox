---
column: review
labels: [core, asyncapi]
priority: low
package: core
agent: claude
live: false
status: Metadata landed; dereference parity confirmed as a real gap
progress: 100
updatedAt: 2026-09-12T00:15:00.000Z
---
# AsyncAPI: remaining metadata and dereference parity

Low-severity unmodelled AsyncAPI constructs (docs/06-spec-coverage/02-asyncapi.md):
`correlationId`, Info `externalDocs`/`termsOfService`, License `url`,
`defaultContentType`, Tag `externalDocs`, channel `servers`/`tags`, and the components
catalogues (messages, parameters, correlationIds, replies, traits) as browsable lists.

Also flagged, unconfirmed: AsyncAPI dereferencing bypasses the shared
`dereferenceDocument` warning machinery that OpenAPI and OpenRPC use, so unresolved-ref
warning parity is unverified. Confirm before assuming it is a bug.

## Checklist

- [x] Verify dereference warning parity with the other two formats
- [x] Parse and render the listed metadata fields
- [x] Components catalogues as browsable lists

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-11T23:20:00.000Z): Cards 18, 20 and 21 are being worked together by one agent. They all touch packages/core/src/formats/asyncapi/index.ts and the AsyncAPI renderer, so splitting them across agents in a shared working tree would mean three of them editing the same two files at once. Bindings (card 19) stay separate — that surface is large enough to stand alone.
- **claude** (2026-09-11T23:55:00.000Z): **Stopped mid-flight and NOT complete.** Session wound up before the agent finished. The tree was green at the checkpoint — typecheck clean, core 117 to 127, ui 165, extension 17 — so the partial work is committed as a safe resting point rather than discarded, but it must not be read as done. packages/core/src/formats/asyncapi/index.ts, packages/core/src/types.ts, examples/streetlights.asyncapi.yaml, packages/ui/src/renderers/asyncapi/* and packages/ui/src/organisms/ServerList.svelte were all being edited when it stopped.
- **claude** (2026-09-11T23:55:00.000Z): Whoever picks this up: re-read the three card bodies and docs/06-spec-coverage/02-asyncapi.md, then diff what actually landed against the checklists before writing anything. Two items were called out as mattering most — `schemaFormat`, because Avro and Protobuf payloads are currently force-walked as JSON Schema and render confidently wrong rather than absent; and the card 21 claim that AsyncAPI dereferencing bypasses the shared warning machinery, which was flagged as UNVERIFIED and must be confirmed before being acted on. Neither is known to be finished.
- **claude** (2026-09-12T00:15:00.000Z): **Correction — the PARTIAL note above was wrong.** The work was finished; only the agent's report was late. Lead marked these cards partial on the assumption that silence meant work in progress, which is the exact error already recorded in the team notes. Verified independently after the fact: typecheck 10x "0 ERRORS", lint clean over 139 files, core 117 to 127, ui 165, cli 7, extension 17, viewer 20, e2e 28. The work is in commit 07d9674, whose message also describes this batch as incomplete and is likewise inaccurate.
- **claude** (2026-09-12T00:15:00.000Z): Landed — security schemes reusing SecuritySchemes.svelte rather than a second component, server variables and security, message examples and correlationId, operation reply/replyAddress, operation security and tags, channel-restricted servers, orphan channels, info tags/externalDocs/termsOfService, license url and defaultContentType. `schemaFormat` now refuses to walk a non-JSON-Schema payload and warns instead, which was the correctness item: Avro and Protobuf previously rendered confidently wrong rather than absent. AsyncAPI parse coverage moves from roughly 35% to roughly 60-65%.
- **claude** (2026-09-12T00:15:00.000Z): Channel-level `tags` deliberately not modelled — `@asyncapi/parser` 3.6.3's `ChannelInterface` exposes no accessor for it, so it could only be read by bypassing the typed model. A field nothing could populate is worse than an honest omission for a low-priority item.
