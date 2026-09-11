---
name: project-spec-coverage-baseline
description: Measured spec coverage baseline for APIBox's three formats as of 2026-09-11 — OpenAPI ~45%, OpenRPC ~64%, AsyncAPI ~35% with bindings at 0%
metadata:
  type: project
---

Coverage assessment run 2026-09-11 (reports in `docs/06-spec-coverage/`, cards 15-23 on the
backlog). Parse-layer FULL coverage against each spec's latest revision:
OpenAPI 3.2 ~45%, OpenRPC 1.3.2 ~64%, AsyncAPI 3.0 ~35%. AsyncAPI bindings are at **0%**.

**Why it matters:** the project's public claim is that it renders three formats; none is
near complete, and the dominant failure mode is loss at the *parse* layer, not the render
layer — renderers show everything core keeps and nothing more.

**How to apply:** when scoping any format work, check the parser first, not the Svelte.
Several gaps are near-free because the UI already exists and nothing feeds it (AsyncAPI
message examples → ExampleViewer; AsyncAPI server variables → ServerList; AsyncAPI security
→ SecuritySchemes.svelte; OpenRPC externalDocs and x-* → helpers in formats/shared.ts that
are simply never called). Prefer those before large new surfaces.
Related: [[project-supported-formats]].
