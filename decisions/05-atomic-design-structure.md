---
status: Accepted
date: 2026-09-10
---
# Decision 05 — Organise the UI library by atomic design

## Context

`@apibox/ui` will hold a lot of components, serving three formats. Without a stated
organising principle, "where does this go?" gets answered differently every time and the
library turns into a flat bag of files.

## Decision

Five levels, one directory each: `atoms/`, `molecules/`, `organisms/`, `templates/`, and
`renderers/`. Dependencies only ever point downward. Every component has a
`.stories.svelte` beside it.

Format-specific renderers live in `@apibox/ui`, not in the viewer app. The viewer is only
a shell — routing, data loading, layout — so putting the OpenAPI renderer there would
make it unreachable from Storybook.

## Consequences

- Every visual piece, including whole-document renderers, is exercisable in isolation
  with no data source and no VS Code.
- The levels invite argument at the edges (is `ParameterRow` a molecule or an organism?).
  The cost of getting one wrong is a file move, so the rule is to place it and move on.
- The viewer app stays thin, which is what keeps the webview and the static site honest
  about being the same thing.
