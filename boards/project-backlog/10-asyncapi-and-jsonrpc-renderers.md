---
column: review
labels: [ui, asyncapi, jsonrpc]
priority: med
package: ui
agent: codex
live: false
status: extracted, integrated and verified in unit and browser suites
progress: 100
updatedAt: 2026-09-10T19:13:53.000Z
---
# AsyncAPI and JSON-RPC renderers

Thin renderers for the other two formats. Their job this pass is to prove the plugin
seam holds — that a format can be added without touching the shell, the schema viewer
or the token layer. Depth comes later.

## Checklist

- [x] AsyncAPI: servers, channels grouped by action, message payloads
- [x] JSON-RPC: methods, params, result, error codes, examples
- [x] Both reuse `SchemaViewer` unchanged

## Gates

- [x] tests-passing — exact board gate passed: clean typecheck/lint, 235 unit tests and 15 Playwright tests across all formats (codex, 2026-09-10T19:13:53Z)
- [x] clean-code-review — renderer extraction findings resolved; full follow-up review found no introduced marker above 0.5 (codex, 2026-09-10T19:13:53Z)

## Comments

- **codex** (2026-09-10T18:16:50.000Z): Claimed after the VS Code extension entered Review. Implementing thin whole-document renderers over the existing normalized models and SchemaViewer, then replacing the viewer shell's format placeholder without changing routing, theming or data sources.
- **codex** (2026-09-10T18:33:20.000Z): Added both renderer paths and connected them to the shared shell in packages/viewer/src/App.svelte:98. Initial renderer and viewer checks passed, then clean-code review identified duplicated schema catalogs and slug logic plus oversized document components. Extraction components now exist in packages/ui/src/renderers/asyncapi/AsyncApiOperationCard.svelte:1, packages/ui/src/renderers/asyncapi/AsyncApiMessage.svelte:1, packages/ui/src/renderers/jsonrpc/RpcMethodCard.svelte:1, packages/ui/src/renderers/jsonrpc/RpcExamplePair.svelte:1 and packages/ui/src/organisms/SchemaCatalog.svelte:1; wiring, formatting and re-verification remain.
- **codex** (2026-09-10T19:13:53.000Z): Wired the extracted components into both document composers, moved OpenAPI onto the same SchemaCatalog and canonical slug helper, and completed stable descendant hooks throughout. Regression coverage also proves repeated JSON-RPC parameter names and error codes remain renderable with unique IDs. All format-level unit and Playwright coverage is green, and the clean-code re-review is clear.
