---
column: backlog
labels: [core, ui, jsonrpc]
priority: low
package: ui
updatedAt: 2026-09-12T06:30:00.000Z
---
# OpenRPC: tag metadata never reaches the page, and info.termsOfService

From the 2026-09-12 re-audit (docs/06-spec-coverage/03-jsonrpc.md), which put OpenRPC at
74% parse / 76% render across 58 constructs.

**Tag `description` and `externalDocs` are parsed in full and never drawn.** The nav group
heading is literally `{group.node.label}` — a bare string with no path for the metadata
(packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:39). No parser change is needed;
`document.tags` already carries everything. This is the carried item from card 22, now
confirmed as a render-only gap rather than the total blackout earlier wording implied.

**`info.termsOfService` is not parsed for JSON-RPC**, though AsyncAPI reads it at
packages/core/src/formats/asyncapi/index.ts:304 and `ApiDocumentBase` already has the field.
One line.

Lower-value, recorded but not recommended without a concrete reader need:

- `x-*` extensions are captured at document root and Method level only, not on params, errors,
  examples, links, servers or tags.
- No browsable catalogue for `components.contentDescriptors`/`examples`/`links`/
  `examplePairings`/`tags`; only schemas have one.
- `summary` is deliberately collapsed into `description` on Server, ContentDescriptor and
  Example — five call sites to unpick if it is ever worth separating.
- Example Object `externalValue` is unmodelled. Note OpenAPI is gaining the same field under
  card 38; if that lands, mirroring it here is cheap.

## Checklist

- [ ] Render tag description and external docs above each group section
- [ ] Parse `info.termsOfService`
- [ ] Mirror `Example.externalValue` once card 38 establishes the shape
