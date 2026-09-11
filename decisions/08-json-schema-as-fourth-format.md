---
status: Accepted
date: 2026-09-11
---
# JSON Schema as a fourth document format

## Context

APIBox renders three formats, each detected from a mandatory root version marker
(`packages/core/src/detect.ts:19-32`). Users want standalone, general-purpose JSON Schema
documents — UI form schemas, config schemas — rendered as documentation too.

JSON Schema has no mandatory version marker. Worse, detection is *unsound in principle*:
every JSON object is a valid JSON Schema, and unknown keywords are legal and ignored. This
is already acknowledged in `packages/core/src/schema.ts:72-74`, where `{}` and `true` are
both accepted as schemas. No content-shape test can distinguish a form schema from a
`tsconfig.json`.

A design review considered a tiered scheme that gated filename and structural heuristics on
"the user named this file individually", allowing heuristics for a single-file VS Code
preview but not for a glob like `apibox build '**/*.json'`.

## Decision

**1. JSON Schema is a peer format module** at `packages/core/src/formats/jsonschema/`, with
a `kind: 'jsonschema'` member added to the `ApiDocument` union. Not a degenerate OpenAPI —
`kind` is user-visible as a header badge (`packages/ui/src/organisms/DocumentHeader.svelte:18`)
and persisted in `ManifestEntry.kind`, so mislabelling would be a lie in both the UI and the
data.

**2. Detection requires an explicit signal. No heuristics.** Precedence:

1. Explicit caller opt-in — `ParseOptions.format` and a CLI `--format jsonschema`.
2. Existing root version markers, unchanged.
3. Root `$schema` matching a recognised dialect URI.

There is no filename signal and no structural heuristic. A `form.schema.json` without
`$schema` raises `UnsupportedDocumentError` and the user passes `--format`.

**3. `$schema` is the version.** Because detection forces `$schema` to be present, the
dialect it declares is a genuine, document-declared version string. `ApiDocumentBase.version`
therefore stays **required** and is populated from the dialect.

**4. No dialect abstraction.** `packages/core/src/schema.ts` is already dialect-tolerant
(draft-04 array `items` vs `prefixItems` at `schema.ts:192-200`; `nullable` vs `type: [...,
'null']` at `schema.ts:135`). Accept 2020-12, 2019-09, draft-07, draft-06, draft-04.

**5. Cross-document `$ref` linking is out of scope** for launch: inline and warn.

## Consequences

**Good.** No new dependencies. No change to `ApiDocumentBase`, `ManifestEntry`, or
`Manifest.schemaVersion` — deployed static sites cannot render `undefined`. Zero
false-positive risk: `apibox build '**/*.json'` can never turn a `package.json` into a
published documentation page. The renderer is small, reusing `SchemaViewer`, `SchemaCatalog`,
`SidebarNav` and the section tracker essentially unchanged.

**Bad.** Most real-world form schemas omit `$schema`, so the common case requires a flag or a
one-line edit to the source file. We accept worse ergonomics in exchange for soundness, and
will revisit if users report the friction. Tier-B heuristics remain available as a later,
additive change — this decision is not hard to reverse in that direction.

**Watch.** Widening `FormatId` (`packages/core/src/types.ts:10`) has a blast radius. Most
call sites are switches that fail at compile time, but
`packages/viewer/src/ViewerShell.svelte:149-162` ends in an `{:else}` that renders the
*empty-workspace* state — an unhandled kind would silently render "Import your first API
description" instead of erroring. That branch must be updated in the same change.
`packages/core/dist/types.d.ts` is committed, so the union widening is source-breaking for
any external consumer with an exhaustive switch.
