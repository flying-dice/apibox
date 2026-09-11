---
column: review
labels: [ui, viewer]
priority: high
package: ui
agent: claude
live: false
status: Renderer and UX fixes complete — 148 ui tests green
progress: 100
updatedAt: 2026-09-11T15:30:00.000Z
---
# JSON Schema format: renderer and shell wiring

Second of three. Depends on card 24.

Almost everything is reused: `SchemaViewer`, `SchemaNodeRow`, `schema-tree.ts`,
`DocumentHeader`, `SidebarNav`, the format-agnostic search filter and the section tracker.
`schemaNavigation` and `SchemaCatalog` already emit the nav group and anchors this format
needs. The genuinely new part is one small `JsonSchemaDocument.svelte` — smaller than the
57-line JsonRpcDocument, since no operations means no `itemsByNavigation`.

**Must not be missed:** packages/viewer/src/ViewerShell.svelte:149-162 ends in an `{:else}`
that renders the *empty-workspace* state. An unhandled `jsonschema` kind will silently
render "Import your first API description" instead of erroring — a wrong render, not a
crash. Verified by reading the file. The empty-state copy also names three formats and needs
updating.

Nav shape: Overview (only when the root carries prose) / Schema (only when the root is more
than a container, mirroring SchemaViewer's existing showRoot logic) / Definitions.

## Checklist

- [x] `JsonSchemaDocument.svelte`; export from packages/ui/src/index.ts
- [x] New branch in ViewerShell.svelte:149 before the else
- [x] Update the empty-workspace copy that names three formats
- [x] `$id` and dialect row in the header
- [x] renderers.test.ts coverage
- [ ] e2e over a new examples/*.schema.json

## Comments

- **claude** (2026-09-11T13:40:00.000Z): Started, with three UX fixes folded in rather than left to a follow-up. (1) packages/ui/src/organisms/DocumentHeader.svelte:18 renders `document.kind` raw and would print "jsonschema"; adding a display-label map for all four kinds. (2) The dialect would print twice — once at DocumentHeader.svelte:19 as `specVersion`, once at :28 as the Version row — since `version` and `specVersion` are the same dialect string by design; adding an optional `versionLabel` prop so JSON Schema shows it once as "Dialect". (3) packages/ui/src/organisms/SchemaCatalog.svelte:22 hardcodes "Schemas", which is tautological for a schema-only document; adding an optional `title` prop and relabelling the nav node in buildNav (packages/core/src/formats/jsonschema/index.ts:131) to "Definitions" so the sidebar and heading agree. Nav node id stays `schemas` so anchors and the section tracker keep working.
- **claude** (2026-09-11T14:20:00.000Z): Renderer landed at packages/ui/src/renderers/jsonschema/JsonSchemaDocument.svelte, exported from packages/ui/src/index.ts and routed at packages/viewer/src/ViewerShell.svelte:155-156. All three UX fixes are additive with defaults, so the other three renderers are untouched apart from badge casing: KIND_LABELS in packages/ui/src/organisms/DocumentHeader.svelte, a `versionLabel` prop on the same file, and a `title` prop on packages/ui/src/organisms/SchemaCatalog.svelte. buildNav relabelled to "Definitions" (packages/core/src/formats/jsonschema/index.ts:131) keeping id `schemas` so anchors and the section tracker still resolve.
- **claude** (2026-09-11T14:20:00.000Z): Verified in the real tree, not a worktree — ran typecheck (0 errors), core 89, ui 148 (+1), e2e 22, all green. Also built a real static site: `bun packages/cli/src/dev.ts build examples/user-profile.schema.json` already succeeds with no CLI changes, emitting `kind: jsonschema`, `version: 2020-12`, confirming the CLI pipeline was already format-agnostic.
- **claude** (2026-09-11T14:20:00.000Z): Carrying one gap to card 26 rather than claiming it done. The ViewerShell routing branch was confirmed only by reading the code — there is no viewer-level test harness, and an unhandled kind falls through to the empty-workspace state while typechecking clean, so CI cannot catch a regression here. Card 26 owns the automated guard.
- **claude** (2026-09-11T15:30:00.000Z): Two duplicated-content defects found by screenshotting a real built site, not by reading tests — the description printed twice (once in DocumentHeader, once in the root SchemaViewer row) and `object` printed twice under the Schema heading. One root cause: the parser promoted the root schema's `description` onto the document and also left it on the root SchemaNode, and that leftover description is itself one of the conditions that forces SchemaViewer to draw the root row at all (packages/ui/src/organisms/SchemaViewer.svelte:40-49). Fixed in one line at packages/core/src/formats/jsonschema/index.ts:69 with the reasoning in a comment above it. Deliberately NOT fixed in SchemaViewer, which is shared by all four renderers.
- **claude** (2026-09-11T15:30:00.000Z): Verified by rebuilding and re-screenshotting myself: the description now appears exactly once and there are no consecutive `object` lines. Regression cover added at packages/core/src/parse.test.ts including the cases that must still draw a root row — `oneOf` composition roots and non-object scalar roots — so the fix cannot silently turn into "never show the root". core 89 to 93 tests, ui 148 and e2e 23 unchanged.
