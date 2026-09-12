---
column: review
labels: [core, ui, asyncapi]
priority: med
package: core
agent: claude
live: false
status: Metadata, extensions and orphan servers landed
progress: 100
updatedAt: 2026-09-12T07:50:00.000Z
---
# AsyncAPI: remaining metadata, extensions and the orphan-channel servers

From the 2026-09-12 re-audit (docs/06-spec-coverage/02-asyncapi.md), which put AsyncAPI at
77% parse / 78% render across 61 enumerated constructs. These are the ten remaining NONE rows
plus one parsed-but-unrendered field.

**Authored `x-*` extensions are not captured for AsyncAPI at all.** Card 36 filtered out the
`x-parser-*` keys the library injects, but nothing ever captured a user's own extensions in
this format — OpenRPC models them as `{key, value}[]` and OpenAPI is gaining the same under
card 38, so AsyncAPI is the odd one out.

**Orphan-channel `servers` is parsed and never drawn.** `ChannelInfo.servers` is populated at
packages/core/src/formats/asyncapi/index.ts:263-270, but the orphan-channel block at
packages/ui/src/renderers/asyncapi/AsyncApiDocument.svelte:66-76 never reads it. Same failure
mode as card 39, in a different place.

**Unread but exposed by the parser's typed interfaces** — these need only a read plus a
render: AsyncAPI `id`, server `protocolVersion`, server `pathname`, server `tags`, message
`tags`, message `externalDocs`, parameter `location`.

**Not exposed by the typed model at all** — `ChannelInterface` omits the tags, external-docs
and title mixins in `@asyncapi/parser@3.6.3`, so channel `tags` and channel `externalDocs`
cannot be read without an untyped cast. Decide whether that cast is worth it; the earlier
judgement was that a field nothing can populate is worse than an honest omission.

**Components as browsable catalogues** — messages, parameters, correlationIds, replies and
traits that no operation references are still invisible.

## Checklist

- [x] Capture and render authored `x-*` extensions, mirroring the OpenRPC shape
- [x] Render orphan-channel `servers`
- [x] Read and render the seven typed-but-unused fields
- [x] Decide on channel `tags`/`externalDocs` and record the reasoning either way
- [x] Decide whether component catalogues earn a browsable section

- **claude** (2026-09-12T09:00:00.000Z): Both implementing agents were killed mid-run by a session limit, but the implementation was finished — they died during verification, not while writing code. Confirmed by auditing the work against the checklist rather than assuming either way, then verifying in a browser.
- **claude** (2026-09-12T09:00:00.000Z): One real bug was left behind and fixed by Lead. `validate.ts` required `result in example` for every OpenRPC example, which rejects an `externalValue`-only example outright, because an absent `result` is dropped entirely by JSON serialisation. The whole wallet document failed `isApiDocument`, so the viewer rendered "not a valid normalized API document" and three e2e tests failed with "element(s) not found". This is the identical trap card 38 hit with `isExample` for OpenAPI — the same mistake, in the same file, a day apart. `RpcExample.result` is now optional, matching its own doc comment that calls it mutually exclusive with `resultExternalValue`.
- **claude** (2026-09-12T09:00:00.000Z): Verified — typecheck 10x "0 ERRORS", lint clean over 142 files, core 181 to 183, ui 197 to 201, cli 7, extension 17, viewer 20, e2e 28. In a real browser both documents render with no page errors: OpenRPC shows terms of service, tag descriptions and the externally hosted example; AsyncAPI shows six authored `x-` extension chips with zero `x-parser` leakage, confirming card 36's filter and the new authored-extension capture coexist.
