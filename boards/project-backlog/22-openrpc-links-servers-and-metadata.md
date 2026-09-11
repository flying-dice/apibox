---
column: review
labels: [core, ui, jsonrpc]
priority: med
package: core
agent: claude
live: false
status: Links, servers, metadata and extensions landed
progress: 100
updatedAt: 2026-09-12T00:40:00.000Z
---
# OpenRPC: links, server variables and metadata

OpenRPC gaps from docs/06-spec-coverage/03-jsonrpc.md. Verified independently: `grep` in
packages/core/src/formats/jsonrpc/index.ts returns zero hits for both `links` and
`variables`.

Several of these are near-free because the shared helper already exists and simply is not
called — root `externalDocs` (packages/core/src/formats/shared.ts:256-261) and `x-*`
extension passthrough (shared.ts:270-272).

Also check the `specVersion` default of `'1.2.6'`
(packages/core/src/formats/jsonrpc/index.ts:55) against the current 1.3.2 spec.

## Checklist

- [x] Model, parse and render `method.links`
- [x] Parse server `variables`
- [x] Parse `info.summary`
- [x] Parse root `externalDocs` via the existing shared helper
- [x] Keep Tag `description`/`externalDocs`, not just `name`
- [x] Parse `method.servers` and `method.externalDocs`
- [x] Capture result ContentDescriptor `deprecated`; render the per-param `deprecated` badge
- [x] Review the 1.2.6 specVersion default
- [x] Tests

## Comments

- **claude** (2026-09-12T00:40:00.000Z): Running in parallel with the other of cards 22 and 27. They are the only two remaining pieces with genuinely disjoint files — 22 is the OpenRPC parser, its model types and the jsonrpc renderer; 27 is the shared schema catalog and viewer organisms. Everything else in the backlog contends on packages/core/src/types.ts and has to be sequenced.
- **claude** (2026-09-12T01:30:00.000Z): Landed. `method.links` modelled as `RpcLink` and rendered with its target, params and own server; `method.servers` override and `method.externalDocs` added; result and per-param `deprecated` now both captured and badged. `info.summary`, root `externalDocs` and server `variables` needed no UI at all — DocumentHeader and ServerList already rendered those fields and the JSON-RPC parser simply never populated them, which is exactly the dead-UI-code pattern the coverage assessment predicted. Extensions reuse the `{key,value}[]` shape card 23 established rather than inventing a second one.
- **claude** (2026-09-12T01:30:00.000Z): specVersion default moved from `1.2.6` to `1.3.2`. The `openrpc` field is spec-required so the fallback should never fire on a compliant document, but leaving it pinned four minor versions back meant silently mislabelling any non-compliant input that did hit it, and the parser already targets 1.3.2 behaviour.
- **claude** (2026-09-12T01:30:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean, core 127 to 138, ui 165 to 166, cli 7, extension 17, viewer 20, e2e 28. Screenshot confirms the Links section, extension chip, server variables, both deprecated badges and the per-method server override all render. Parse coverage moves from roughly 64% to the high 70s.
- **claude** (2026-09-12T01:30:00.000Z): Carried — tag `description`/`externalDocs` are now parsed but not rendered, because a tag group's heading comes from shared navigation code outside the jsonrpc renderer. Left for whoever wants tag metadata shown consistently across all four formats rather than bolted onto one.
