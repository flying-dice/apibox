---
column: backlog
labels: [core, ui, jsonrpc]
priority: med
package: core
updatedAt: 2026-09-11T12:00:00.000Z
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

- [ ] Model, parse and render `method.links`
- [ ] Parse server `variables`
- [ ] Parse `info.summary`
- [ ] Parse root `externalDocs` via the existing shared helper
- [ ] Keep Tag `description`/`externalDocs`, not just `name`
- [ ] Parse `method.servers` and `method.externalDocs`
- [ ] Capture result ContentDescriptor `deprecated`; render the per-param `deprecated` badge
- [ ] Review the 1.2.6 specVersion default
- [ ] Tests
