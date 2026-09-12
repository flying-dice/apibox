---
column: backlog
labels: [core, ui]
priority: med
package: core
updatedAt: 2026-09-12T06:00:00.000Z
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

- [ ] Model and render the content vocabulary
- [ ] `$anchor`, `$dynamicRef`, `$dynamicAnchor`; decide whether `$comment` and `$vocabulary`
      earn screen space and record the reasoning
- [ ] Capture nested subschema `$id`
- [ ] Accept a bare boolean document, or state why rejecting it is right
