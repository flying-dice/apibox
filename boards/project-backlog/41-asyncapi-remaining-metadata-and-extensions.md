---
column: backlog
labels: [core, ui, asyncapi]
priority: med
package: core
updatedAt: 2026-09-12T06:15:00.000Z
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

- [ ] Capture and render authored `x-*` extensions, mirroring the OpenRPC shape
- [ ] Render orphan-channel `servers`
- [ ] Read and render the seven typed-but-unused fields
- [ ] Decide on channel `tags`/`externalDocs` and record the reasoning either way
- [ ] Decide whether component catalogues earn a browsable section
