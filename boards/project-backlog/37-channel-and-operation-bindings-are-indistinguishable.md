---
column: backlog
labels: [ui, asyncapi]
priority: med
package: ui
updatedAt: 2026-09-12T04:05:00.000Z
---
# Channel and operation bindings render as two identical rows

An operation card with both channel-level and operation-level bindings draws two adjacent chip
rows that look the same — `mqtt v0.2.0 · qos 1 · retain false` immediately above
`mqtt v0.2.0 · qos 1` — with nothing saying which is which.

The distinction matters: a channel binding applies to every operation on that channel, an
operation binding only to this one. A reader currently cannot tell them apart, and may
reasonably assume the second row is a typo of the first.

Found by looking at the render during card 19 review. Tests assert both rows exist and carry
the right fields, and all pass — they have no opinion on whether the result is readable.

## Checklist

- [ ] Label each binding row with its location, or otherwise distinguish them
- [ ] Keep it dense — cards 29/30 deliberately flattened this UI
- [ ] Check the same ambiguity does not exist between message and operation bindings
- [ ] Screenshot all four locations together to confirm
