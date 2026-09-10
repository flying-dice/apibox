---
status: Accepted
date: 2026-09-10
---
# Decision 02 — Normalise every format into one document model

## Context

OpenAPI, AsyncAPI and OpenRPC describe overlapping ideas in incompatible shapes.
Renderers could read each raw specification directly, or read a normalised model that
the parsers produce.

Reading raw specs would mean every renderer handles OpenAPI 3.0 vs 3.1 differences,
`example` vs `examples`, path-level vs operation-level parameters, and `$ref` resolution
in its own way — and the UI package would depend on the shape of three moving standards.

## Decision

`@apibox/core` parses every format down to one `ApiDocument` discriminated union, defined
in `packages/core/src/types.ts`. The UI never sees a raw specification object.

Two details are load-bearing:

- All three formats describe payloads with JSON Schema, so they normalise to one shared
  `SchemaNode` tree and share one schema renderer.
- Composition keywords (`oneOf`, `anyOf`, `allOf`) are preserved, not merged. Showing a
  reader "one of these three shapes" is more honest than showing a synthesised union that
  appears nowhere in their spec.

## Consequences

- Adding a fourth format means writing a parser and a renderer; the shell, the schema
  viewer, the token layer and the CLI are untouched.
- The normalised model is also the wire format: it is what the CLI writes to
  `data/<id>.json` and what the extension posts into the webview. One model, three hosts.
- Normalisation is lossy by design. Anything a renderer needs must be represented in the
  model, so adding a UI detail sometimes means touching core first.
