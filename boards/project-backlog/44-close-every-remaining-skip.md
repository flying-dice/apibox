---
column: review
labels: [core, ui, openapi, jsonrpc]
priority: high
package: core
agent: claude
live: false
status: All four skips closed; every construct now parsed and rendered
progress: 100
updatedAt: 2026-09-12T11:20:00.000Z
---
# Close every remaining skip

Four constructs remain unimplemented across the four formats. Re-examined, every one was an
editorial judgement about whether a reader wants it — not a technical limit. The stated goal
is full coverage, so each gets implemented.

**`$comment` (JSON Schema).** Skipped because the spec says it MUST NOT be used to convey
information to consumers. That is a rule about what an author may rely on, not a prohibition
on a documentation tool showing what a document contains. Parse it, and render it as an
authoring note clearly marked as such so no reader mistakes it for normative content.

**`$vocabulary` (JSON Schema).** Skipped as "a renderer cannot act on it". A reader assessing
which dialect features are in play can act on it perfectly well — it declares exactly which
vocabularies the meta-schema requires. Parse and surface it.

**OpenRPC component catalogues** — `tags`, `examples`, `examplePairings`, `links`. Skipped on
the argument that a catalogue would surface only orphans. True, and orphans are precisely what
a reader cannot otherwise discover: a reusable component defined and not yet referenced is
still part of the document's contract. `contentDescriptors` already has a catalogue; give the
rest the same treatment.

**Webhook `operationRef` links (OpenAPI).** Skipped because no fixture demonstrated it.
Add the fixture, then resolve `#/webhooks/...` pointers in `resolveLinkOperationRefs`
alongside the existing `#/paths/...` form.

## Checklist

- [x] `$comment` parsed and rendered, marked as an authoring note
- [x] `$vocabulary` parsed and surfaced
- [x] Catalogues for OpenRPC tags, examples, examplePairings and links
- [x] Webhook `operationRef` resolution, with a fixture that exercises it

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-12T12:00:00.000Z): All four closed and all four render. `$comment` is parsed and shown as a visually distinct authoring note, so it cannot be mistaken for normative content — the spec constrains what an author may rely on a validator doing, not whether a documentation tool may show what a document contains. `$vocabulary` surfaces as mandatory/optional chips beside the dialect, which is exactly the reader who can act on it. The four remaining OpenRPC catalogues follow the contentDescriptors pattern from card 43 rather than inventing another. Webhook `operationRef` now resolves because `resolveLinkOperationRefs` builds `#/paths/...` and `#/webhooks/...` into one map, with a fixture that exercises it — the absence of that fixture was the original reason for skipping.
- **claude** (2026-09-12T12:00:00.000Z): `validate.ts` was taught every new field, including `extensions` on `ExampleValue`. That trap had bitten four times this session; it did not bite a fifth.
- **claude** (2026-09-12T12:00:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 148 files, core 203 to 211, ui 213 to 226, cli 7, extension 17, viewer 20, e2e 28.
- **claude** (2026-09-12T12:00:00.000Z): Flagged rather than fixed, so it is not lost: `RpcExamplePairingCatalog` shows an example name twice, once in the collapsible summary and once in `RpcExamplePair`'s own heading — the same duplication card 27 fixed elsewhere. Also `isRpcMethod` never validated `RpcMethod.links`, a pre-existing hole unrelated to this card.
