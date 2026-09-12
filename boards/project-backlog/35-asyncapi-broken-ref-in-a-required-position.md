---
column: review
labels: [core, asyncapi]
priority: low
package: core
agent: claude
live: false
status: Drop-and-warn for refs in required positions
progress: 100
updatedAt: 2026-09-12T04:20:00.000Z
---
# A broken $ref in a required position still fails the document

Card 34 made a broken `$ref` degrade to a visible marker instead of destroying the whole
AsyncAPI document. That guarantee has one hole, found and reported while fixing it rather
than discovered later.

When the broken pointer sits where the target shape has **required** fields — say
`servers.foo: {$ref: <broken>}`, when a Server Object requires `host` and `protocol` — the
substituted marker does not satisfy validation and the document can still fail to parse.

Not a regression: that case failed before card 34 too. But it means the guarantee is
honestly "any broken `$ref` in a position whose target shape has no required fields", which
covers schema-position breaks and every scenario the card's tests exercise, and not the
general claim.

## Options

- Substitute a minimal shape-valid stub per position rather than one generic marker, which
  means knowing what each position requires.
- Drop the offending entry entirely and warn, rather than trying to keep it.

## Checklist

- [x] Reproduce with a broken `$ref` in a `servers` entry, as a failing test first
- [x] Decide between a shape-aware stub and dropping the entry, and record why
- [x] Confirm the reader is still told which pointer broke
- [x] Keep card 34's schema-position behaviour unchanged
- **claude** (2026-09-12T05:10:00.000Z): Fixed with drop-and-warn rather than a shape-aware stub. A stub would need per-position knowledge of what each AsyncAPI object requires — Server, Channel, SecurityScheme and so on — which is exactly the ageing risk this card named. Instead the parser reads the validation diagnostics, matches a severity-0 diagnostic's path against the known unresolved-ref positions, drops that entry and retries once. General across every position, encoding no spec-shape knowledge. It engages only when the plain marker genuinely fails validation, so card 34's schema-position behaviour never reaches this branch — pinned by a regression test.

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.
