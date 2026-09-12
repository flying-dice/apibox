---
column: review
labels: [core, ui, openapi]
priority: high
package: core
agent: claude
live: false
status: Webhooks and the last parse-layer gaps closed
progress: 100
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

- [x] `webhooks` parsed, reusing the existing path-item operation helper
- [x] `webhooks` rendered as its own top-level section
- [x] `Example.externalValue` read and rendered as a link
- [x] `Encoding.itemSchema` / `itemEncoding`
- [x] Document/Info/Operation/Tag/Server `x-*` extensions captured and rendered
- [x] Closed schemas visibly distinguished from unspecified ones

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-12T07:00:00.000Z): All five landed and all five render — nothing left modelled-only. `webhooks` reuses `parsePathItemOperations` rather than a second path-item walker, shares the operation id set with `paths` so ids stay unique across both, and gets its own flat nav group.
- **claude** (2026-09-12T07:00:00.000Z): A webhook has no URL, so `Operation.path` holds the webhook's own name. That is the identity a reader already has for it, and it matches how a callback already carries its runtime expression — no fabricated path.
- **claude** (2026-09-12T07:00:00.000Z): Found a real bug on the way, not a hypothetical one: `isExample` in packages/core/src/validate.ts tested `value in value`, which rejects an externalValue-only example outright, because JSON serialisation drops an absent `value` key entirely. It surfaced in the e2e run rather than a unit test, since it only bites after a document round-trips through the manifest.
- **claude** (2026-09-12T07:00:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 140 files, core 172 to 181, ui 187 to 188, cli 7, extension 17, viewer 20, e2e 28.
- **claude** (2026-09-12T07:00:00.000Z): Carried deliberately, with reasoning: webhook operationRef links are not resolved against `#/webhooks/...` pointers. Closing it means a second pointer-format branch in `resolveLinkOperationRefs` for a case no fixture demonstrates. Recorded in a code comment rather than silently skipped.
