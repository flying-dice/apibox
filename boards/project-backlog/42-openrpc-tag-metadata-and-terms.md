---
column: review
labels: [core, ui, jsonrpc]
priority: low
package: ui
agent: claude
live: false
status: Tag metadata, termsOfService and externalValue landed
progress: 100
updatedAt: 2026-09-12T07:50:00.000Z
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

- [x] Render tag description and external docs above each group section
- [x] Parse `info.termsOfService`
- [x] Mirror `Example.externalValue` once card 38 establishes the shape

- **claude** (2026-09-12T09:00:00.000Z): Both implementing agents were killed mid-run by a session limit, but the implementation was finished — they died during verification, not while writing code. Confirmed by auditing the work against the checklist rather than assuming either way, then verifying in a browser.
- **claude** (2026-09-12T09:00:00.000Z): One real bug was left behind and fixed by Lead. `validate.ts` required `result in example` for every OpenRPC example, which rejects an `externalValue`-only example outright, because an absent `result` is dropped entirely by JSON serialisation. The whole wallet document failed `isApiDocument`, so the viewer rendered "not a valid normalized API document" and three e2e tests failed with "element(s) not found". This is the identical trap card 38 hit with `isExample` for OpenAPI — the same mistake, in the same file, a day apart. `RpcExample.result` is now optional, matching its own doc comment that calls it mutually exclusive with `resultExternalValue`.
- **claude** (2026-09-12T09:00:00.000Z): Verified — typecheck 10x "0 ERRORS", lint clean over 142 files, core 181 to 183, ui 197 to 201, cli 7, extension 17, viewer 20, e2e 28. In a real browser both documents render with no page errors: OpenRPC shows terms of service, tag descriptions and the externally hosted example; AsyncAPI shows six authored `x-` extension chips with zero `x-parser` leakage, confirming card 36's filter and the new authored-extension capture coexist.
