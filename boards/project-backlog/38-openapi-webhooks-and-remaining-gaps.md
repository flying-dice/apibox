---
column: doing
labels: [core, ui, openapi]
priority: high
package: core
agent: claude
live: true
status: Webhooks, externalValue, encoding items, document extensions
progress: 10
updatedAt: 2026-09-12T05:40:00.000Z
---
# OpenAPI: webhooks and the last parse-layer gaps

Found by the 2026-09-12 re-audit (docs/06-spec-coverage/01-openapi.md), which put OpenAPI at
91% FULL. These are what remains at the parse layer.

**`webhooks`** is the significant one. The OpenAPI 3.1 root field is entirely absent — no
field on `OpenApiDocument`, no parse code, no render. Verified by grep returning zero across
both `packages/core/src` and `packages/ui/src`. For an API whose primary surface is webhooks,
apibox currently renders a document with its main content missing and says nothing about it.

The rest are small:

- `Example.externalValue` — not read at all, so an example held at a URL renders as nothing.
- `Encoding.itemSchema` / `itemEncoding` (3.2) — not read.
- Document, Info, Operation, Tag and Server level `x-*` extensions are recognised only as keys
  to skip, never captured. Schema-level extensions work; everything above them does not.
  `JsonRpcDocument.extensions` already models exactly this shape and can be mirrored.
- `additionalProperties: false` and the analogous `unevaluated*` booleans are parsed but never
  shown, so a closed schema looks identical to an unspecified one. The model comment at
  `packages/core/src/types.ts` is explicit that the two must read differently.

## Checklist

- [ ] `webhooks` parsed, reusing the existing path-item operation helper
- [ ] `webhooks` rendered as its own top-level section
- [ ] `Example.externalValue` read and rendered as a link
- [ ] `Encoding.itemSchema` / `itemEncoding`
- [ ] Document/Info/Operation/Tag/Server `x-*` extensions captured and rendered
- [ ] Closed schemas visibly distinguished from unspecified ones
