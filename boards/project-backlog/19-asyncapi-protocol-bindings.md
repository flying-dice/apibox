---
column: review
labels: [core, ui, asyncapi]
priority: high
package: core
agent: claude
live: false
status: Bindings at all four locations, generic across protocols
progress: 100
updatedAt: 2026-09-12T03:30:00.000Z
---
# AsyncAPI: protocol bindings

Bindings coverage is **0%** — no protocol, no binding location, anywhere in the codebase
(docs/06-spec-coverage/02-asyncapi.md). Verified: `grep -rni bindings` across
packages/core/src and packages/ui/src returns zero hits.

Bindings are where AsyncAPI carries the protocol-specific detail that makes an event API
actually usable — Kafka topic config, AMQP exchange settings, MQTT QoS. Without them the
rendered document is generic to the point of being much less useful than the source file.

Large surface. Scope this to a first cut before starting: propose which protocols ship
first (kafka, amqp, mqtt, ws, http are the likely set) and bring the proposal back for a
decision rather than attempting all of them.

## Checklist

- [x] Launch protocol set decided by the user: all protocols
- [x] Model bindings at all four locations: server, channel, operation, message
- [x] Parse bindings for the agreed protocols
- [x] Render bindings per location
- [x] Tests

## Comments

- **claude** (2026-09-12T03:30:00.000Z): The user chose full protocol coverage rather than a staged subset, so the sign-off this card demanded is given and the question is now how to reach every protocol without hand-modelling roughly forty interfaces. A generic representation keyed by protocol reaches all of them by construction and cannot go stale as AsyncAPI adds more; typed per-protocol interfaces would cover a fixed handful properly and silently drop the rest. That tradeoff is the real decision in this card.
- **claude** (2026-09-12T04:05:00.000Z): Landed generic rather than typed, which is what makes "every protocol" actually true. `BindingInfo` carries protocol, version and a flat field list, matching the shape `@asyncapi/parser` itself exposes (`Collection<BindingInterface>`: a protocol name, an untyped value, a separate version). A typed union would have meant roughly forty interfaces today and gone stale the moment AsyncAPI adds a protocol. The NATS test at packages/core/src/parse.test.ts:1573 is the proof: it exercises no protocol-specific branch anywhere in the parser or the renderer and still surfaces.
- **claude** (2026-09-12T04:05:00.000Z): Accepted cost of that choice, recorded so nobody is surprised — readers get `key: value` chips, not protocol-aware labels. There is no "QoS 1 (at-least-once)" enrichment and no unit formatting. Completeness that never goes stale, in exchange for no domain knowledge per protocol.
- **claude** (2026-09-12T04:05:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 140 files, core 161 to 167, ui 176 to 184, cli 7, extension 17, viewer 20, e2e 28. Screenshot confirms all four locations drawing: server `clientId/cleanSession/keepAlive`, channel `qos/retain`, operation `qos`, message `payloadFormatIndicator`. Card 34's broken-$ref handling, the 2.x path and the identity-dependent security-scheme recovery all still pass with bindings present.
- **claude** (2026-09-12T04:05:00.000Z): Two legibility problems found by looking at the render, not by any test — filed as cards 36 and 37. Neither blocks this card.
