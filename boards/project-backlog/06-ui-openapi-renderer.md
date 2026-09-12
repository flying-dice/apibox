---
column: review
labels: [ui, openapi]
priority: high
package: ui
agent: codex
live: false
updatedAt: 2026-09-10T16:58:00.000Z
---
# OpenAPI renderer

The deep renderer this first pass is judged on: document header, servers, security
schemes, tag-grouped operations, parameter tables, request bodies, response lists with
headers and examples, and schema drill-down — all built from the atoms and molecules,
none of it embedded from Redoc or Scalar. See decisions/01-own-renderers-not-embeds.md.

## Checklist

- [x] `DocumentHeader`, `SecuritySchemes`, servers
- [x] `OperationCard` with method, path, deprecation
- [x] `ParameterTable` grouped by location
- [x] `RequestBody` and `ResponseList` with media-type tabs
- [x] `ExampleViewer`
- [x] `DocLayout` template (sidebar + content)
- [x] Story rendering the whole Petstore document

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T16:36:45.000Z): Claimed the deep OpenAPI renderer after cards 04 and 05 entered Review. Mapping the public model in packages/core/src/types.ts:1 to the completed UI primitives exported from packages/ui/src/index.ts:15 before implementing the organism and template layer.
- **codex** (2026-09-10T16:58:00.000Z): Completed the renderer and moved it to Review. The document composition is in packages/ui/src/renderers/openapi/OpenApiDocument.svelte:39, with operations composed in packages/ui/src/organisms/OperationCard.svelte:21 and full Petstore behavior covered in packages/ui/src/renderers/openapi/OpenApiDocument.test.ts:10. The exact Review command `bun run typecheck && bun run lint && bun run test` passes (69 core + 132 UI tests); the Storybook production build also passes. The proportional clean-code review found no remaining marker above 0.5 after consolidating indexed tab state and containing non-serializable examples.
