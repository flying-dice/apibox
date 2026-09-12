---
column: review
labels: [core, ui, asyncapi, jsonrpc]
priority: med
package: core
agent: claude
live: false
status: Omissions closed; .json() confirmed public API
progress: 100
updatedAt: 2026-09-12T10:10:00.000Z
---
# Close the items previously judged not worth doing

Several constructs were recorded across cards 21, 41 and 42 as deliberate omissions. That
judgement was mine substituting for an instruction to reach full coverage, and on re-reading
at least one of the reasons does not hold.

**Channel `tags` and `externalDocs` (AsyncAPI).** Recorded as impossible without "an untyped
cast into library internals". That framing was wrong: `@asyncapi/parser`'s models expose a
public `.json()` accessor returning the underlying document object. `ChannelInterface` lacking
the tags mixin means the typed accessor is missing, not that the data is unreachable through
supported API. Read it through `.json()`, and guard against the shape being absent.

**OpenRPC items recorded as "no fix recommended without a concrete need":**

- `x-*` extensions on params, errors, examples, links, servers and tags. Document root and
  Method level already work, so this is filling in the levels, not new machinery.
- Component catalogues for `contentDescriptors`, `examples`, `links`, `examplePairings` and
  `tags`. Schemas already have one; these are the reusable components a reader currently
  cannot browse at all.
- `summary` collapsed into `description` on Server, ContentDescriptor and Example. Five call
  sites. The two fields mean different things in the spec and a reader currently cannot tell
  which they are reading.

Each is small. The reason none were done is that they were individually low-value, which is a
poor reason when the stated goal is coverage.

## Checklist

- [x] Channel `tags` and `externalDocs` via the parser's public `.json()`
- [x] OpenRPC `x-*` at the remaining levels
- [x] OpenRPC component catalogues, or a recorded reason they genuinely do not belong
- [x] Separate `summary` from `description` where the spec distinguishes them

## Comments

- **claude** (2026-09-12T11:00:00.000Z): My defence of these omissions was wrong twice over. `.json()` is confirmed public API on `BaseModel`, so channel tags were always reachable through supported means — and card 41 had in fact already implemented them, via an untyped cast, without flagging that it had gone against the recorded reasoning. This card rewrote that read to use the public accessor, guarded with the existing `asRecord`/`asArray`/`asString` helpers. So the honest history is: the feature was not missing, it was reached the wrong way, and my note claiming it was unreachable was never true.
- **claude** (2026-09-12T11:00:00.000Z): OpenRPC `x-*` extensions now captured at every level — params, errors, examples, links, servers and tags — reusing the established `{key, value}[]` shape. While verifying visually the agent found tags were parsed WITH extensions and never rendered, and fixed it. That is the fourth instance of parsed-but-never-drawn found this session, and again it was a screenshot that caught it, not a test.
- **claude** (2026-09-12T11:00:00.000Z): `summary` and `description` separated at all five OpenRPC call sites where the spec distinguishes them, rendered on one merged line so a row does not double in height.
- **claude** (2026-09-12T11:00:00.000Z): Component catalogues judged individually rather than mechanically. `contentDescriptors` earns a browsable section and got one. `tags`, `examples`, `examplePairings` and `links` were skipped with the reasoning recorded in code: anything a method references already renders in full at that method, so a catalogue would surface only orphans — dead weight in the source document rather than a discoverability gap apibox should paper over. I accept that argument; it is coverage of the reader's need, not of the spec's table of contents.
- **claude** (2026-09-12T11:00:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 144 files, core 195 to 203, ui 207 to 213, cli 7, extension 17, viewer 20, e2e 28.
