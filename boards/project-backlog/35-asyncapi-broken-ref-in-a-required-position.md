---
column: backlog
labels: [core, asyncapi]
priority: low
package: core
updatedAt: 2026-09-12T02:05:00.000Z
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

- [ ] Reproduce with a broken `$ref` in a `servers` entry, as a failing test first
- [ ] Decide between a shape-aware stub and dropping the entry, and record why
- [ ] Confirm the reader is still told which pointer broke
- [ ] Keep card 34's schema-position behaviour unchanged
