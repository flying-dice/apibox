---
status: Accepted
date: 2026-09-10
---
# Decision 01 — Render API docs with our own components

## Context

There are capable off-the-shelf renderers: Redoc, Scalar and Swagger UI for OpenAPI,
`@asyncapi/react-component` for AsyncAPI. Embedding them would have produced a working
extension in a fraction of the time.

But apibox renders three formats side by side, inside VS Code. Embedding means three
separate design languages in one sidebar, three theming stories — none of which follow
the user's VS Code colour theme — and three upstream projects deciding what our product
looks like. A JSON-RPC renderer does not exist off the shelf at all, so at least one
format was always going to be ours.

## Decision

Every pixel is our own Svelte. No renderer is embedded, wrapped or iframed.

Established libraries are still used for *parsing*: `@apidevtools/json-schema-ref-parser`
for dereferencing, `@asyncapi/parser` for AsyncAPI, `yaml` for loading. Spec parsing is
full of edge cases that are miserable to rediscover and carry no design consequences.

## Consequences

- One design language across all three formats, and one theme story: VS Code's own.
- A single `SchemaViewer` serves all three formats, because they all normalise to the
  same schema tree. That reuse is only available to us because we own the renderers.
- Considerably more work up front, and OpenAPI edge cases we will discover ourselves.
  This is why the first pass renders OpenAPI deeply and the other two formats thinly.
