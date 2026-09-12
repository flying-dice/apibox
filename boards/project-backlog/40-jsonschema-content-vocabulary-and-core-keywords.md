---
column: review
labels: [core, ui]
priority: med
package: core
agent: claude
live: false
status: Content vocabulary, nested $id and dynamic refs landed
progress: 100
updatedAt: 2026-09-12T09:20:00.000Z
---
# JSON Schema: content vocabulary and remaining core keywords

From the first JSON Schema coverage audit (docs/06-spec-coverage/04-jsonschema.md), which put
the format at roughly 81% parse FULL. These are what remains.

- **The entire content vocabulary** — `contentEncoding`, `contentMediaType`, `contentSchema` —
  is unmodelled: no field, no read, no render. This is how a schema says "this string is
  base64-encoded PNG", which a reader cannot otherwise infer.
- `$comment`, `$vocabulary`, `$anchor`, `$dynamicRef`, `$dynamicAnchor` have no representation
  anywhere. The two dynamic-ref keywords are structural rather than cosmetic.
- **Nested subschema `$id` is invisible.** Only the document root's `$id` is captured, so in a
  bundled multi-schema file every per-`$defs` `$id` vanishes — exactly the case bundles exist
  for.
- A bare boolean document (`true` or `false` as the whole file) is rejected by
  `parseJsonSchema`'s `asRecord` check, even though `normaliseSchema` already handles boolean
  schemas correctly when nested. Rare, but the asymmetry is odd.

## Checklist

- [x] Model and render the content vocabulary
- [x] `$anchor`, `$dynamicRef`, `$dynamicAnchor`; decide whether `$comment` and `$vocabulary`
      earn screen space and record the reasoning
- [x] Capture nested subschema `$id`
- [x] Accept a bare boolean document, or state why rejecting it is right

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-12T10:00:00.000Z): Landed. The content vocabulary is modelled with `contentSchema` nesting like the other schema-valued keywords card 23 added, rather than as a flat string. Nested `$id` is now captured at every node, not just the document root, which is the case bundles exist for — the root's own `$id` is stripped from its node to avoid rendering it twice alongside the header. `$anchor`, `$dynamicRef` and `$dynamicAnchor` all render, since a reader who cannot see a dynamic ref cannot follow how the schema resolves.
- **claude** (2026-09-12T10:00:00.000Z): The agent checked `validate.ts` unprompted and taught it the new fields, including recursing into `contentSchema`. That is the trap this project hit twice — a new optional field making a previously valid document fail `isApiDocument`, which surfaces as a blank viewer and e2e "element(s) not found" rather than a unit test failure. Third time it did not bite.
- **claude** (2026-09-12T10:00:00.000Z): `$comment` and `$vocabulary` deliberately not modelled, with the strongest reasoning of the session: the spec states `$comment` MUST NOT be used to convey information to consumers, so rendering it to a reader would contradict the spec's own intent. `$vocabulary` declares meta-schema requirements that a renderer, as opposed to a validator, cannot act on. Recorded in code, not just here.
- **claude** (2026-09-12T10:00:00.000Z): The bare-boolean-document item turned out to be mis-framed in the audit, and the correction is better than the original finding. It is not merely reachable only via an explicit format hint — it is unreachable through any public entry point at all, because `detectFormat` calls `asRecord` before it consults the hint, and `parseJsonSchema` is not exported. Loosening its guard would add code nothing can exercise.
- **claude** (2026-09-12T10:00:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 142 files, core 183 to 195, ui 201 to 207, cli 7, extension 17, viewer 20, e2e 28. A cross-format test proves the shared-model change reaches OpenAPI, since `SchemaNode` serves all four.
