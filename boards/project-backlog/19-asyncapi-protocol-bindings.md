---
column: backlog
labels: [core, ui, asyncapi]
priority: high
package: core
updatedAt: 2026-09-11T12:00:00.000Z
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

- [ ] Decide the launch protocol set (needs Lead sign-off before implementation)
- [ ] Model bindings at all four locations: server, channel, operation, message
- [ ] Parse bindings for the agreed protocols
- [ ] Render bindings per location
- [ ] Tests
