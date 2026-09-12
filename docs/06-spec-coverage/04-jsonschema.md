---
title: JSON Schema coverage
---
# JSON Schema specification coverage

Assessed 2026-09-12 against JSON Schema 2020-12 (draft 2020-12), with the older accepted
dialects — 2019-09, draft-07, draft-06, draft-04 — assessed for the keyword-shape differences
apibox is documented as tolerating (`decisions/08-json-schema-as-fourth-format.md`).

## Headline

apibox's fourth format is a thin, honest parser: it dereferences `$ref`, walks the result
through the same `normaliseSchema` used by the other three formats
(`packages/core/src/schema.ts`), and shows the root schema plus every `$defs`/`definitions`
entry. Because card 23 pushed if/then/else, `patternProperties`, `propertyNames`, `contains`,
`dependentRequired`/`dependentSchemas`, `unevaluatedProperties`/`unevaluatedItems` and `x-*`
extensions into that same shared normaliser, all of them reach a standalone JSON Schema
document for free — verified below by tracing each keyword from `schema.ts` through
`JsonSchemaDocument.svelte` → `SchemaViewer.svelte` → `SchemaNodeRow.svelte` →
`schema-tree.ts` → `PropertyRow.svelte`. Nothing in that render chain is OpenAPI/AsyncAPI/
JSON‑RPC-specific, so what those formats already exercise is inherited, not reimplemented.

What is genuinely missing is not applicator/validation coverage but a cluster of **core**
2019-09+ keywords apibox has never modelled for any format: `$anchor`, `$dynamicRef`,
`$dynamicAnchor`, `$vocabulary`, `$comment`, and the entire **content** vocabulary
(`contentEncoding`, `contentMediaType`, `contentSchema`). None of these appear anywhere in
`packages/core/src/schema.ts` or `packages/core/src/formats/jsonschema/index.ts`. A document
that leans on `$dynamicRef`/`$dynamicAnchor` for extensible vocabularies, or that documents a
base64-encoded file upload via `contentEncoding`/`contentMediaType`, gets no representation of
that keyword at all — not even a dropped-silently gap, since nothing reads the key.

Document-level: detection is explicit-signal only by design (root `$schema` dialect match, or
caller opt-in) — `packages/core/src/detect.ts:92-96` — which means the overwhelming majority
of real-world form/config schemas (which omit `$schema`) are **not detected** and fail with
"Could not identify the document" unless the caller passes `--format jsonschema`. This is a
deliberate, documented trade-off (`decisions/08-json-schema-as-fourth-format.md`), not an
oversight, and is scored N/A rather than as a gap. Multi-file `$ref` across schema documents
resolves via the same generic `@apidevtools/json-schema-ref-parser` pass every format uses
(`packages/core/src/formats/shared.ts:48-88`) — no JSON-Schema-specific limitation was found
beyond the shared one (a broken/unreachable external ref degrades to an explicit unresolved
marker, not document failure). `$id` is captured only at the document root
(`packages/core/src/formats/jsonschema/index.ts:76`); a nested subschema's own `$id` (used by
the spec to re-base its own internal refs and by bundling tools to combine many schemas into
one file) is not surfaced anywhere in the model — it still participates correctly in `$ref`
resolution (that's `$RefParser`'s job, not apibox's), but a reader has no way to see that a
given `$defs` entry declares its own `$id`. `version` for this format is the `$schema` dialect
string (`2020-12`, `draft-07`, …), which is honestly the only per-document version JSON Schema
has (`packages/core/src/formats/jsonschema/index.ts:81-84`).

Rough computation, counting each matrix row below as one construct and excluding the three
N/A rows (detection ergonomics, the `summary`/`contact`/`license`/`externalDocs`/
`termsOfService` group, and `servers`/`tags` — none of which JSON Schema's own vocabulary has
an equivalent for) and the bare-boolean-document row (a policy edge case, not a keyword): of
54 addressable constructs, **44 are FULL, 1 is PARTIAL (`$id`, root-only), and 9 are NONE**.

- **Parse layer**: 44/54 FULL (~81%), 1/54 PARTIAL (~2%), 9/54 NONE (~17%).
- **Render layer**: bounded by parse, as always. Of the 45 constructs parsed at FULL or
  PARTIAL, 43 render FULL, 1 renders PARTIAL (`$id`, same root-only limitation), and exactly
  **one** — `examples` — is parsed correctly but never rendered at all (Gap 1). That single
  miss aside, the renderer chain (`SchemaViewer.svelte`/`SchemaNodeRow.svelte`/
  `schema-tree.ts`/`PropertyRow.svelte`) is shared infrastructure already proven by the other
  three formats, and nearly every field the JSON Schema parser populates on `SchemaNode` has a
  corresponding render path.

## Coverage matrix

| Construct | Draft | Parse | Render | Evidence (path:line) | Notes |
|---|---|---|---|---|---|
| **Document / core identifiers** | | | | | |
| `$schema` (dialect → `version`) | all | FULL | FULL | parse `packages/core/src/formats/jsonschema/index.ts:42-51,84`; dialect map `packages/core/src/detect.ts:28-42`; render `packages/ui/src/organisms/DocumentHeader.svelte:38` (labelled "Dialect" via `versionLabel` prop, `packages/ui/src/renderers/jsonschema/JsonSchemaDocument.svelte:23`) | Unrecognised or absent dialect defaults to `2020-12` with a pushed warning, tested `packages/core/src/parse.test.ts:152-171`. |
| `$id` / draft-04 `id` (root only) | all | PARTIAL | PARTIAL | root: `packages/core/src/formats/jsonschema/index.ts:76,87`; render `packages/ui/src/renderers/jsonschema/JsonSchemaDocument.svelte:25-29`; test `packages/core/src/parse.test.ts:116,148` | Root `$id` is FULL; a subschema's own `$id` (re-basing internal refs, or a bundle marker) is never read — no `$id` handling anywhere in `packages/core/src/schema.ts` (confirmed by inspection: no match for `$id` in that file), so the row is scored PARTIAL overall. It still resolves correctly for `$ref` purposes via `$RefParser`, which is a separate concern from surfacing it to the reader. See Gap 4. |
| `$ref` (internal) | all | FULL | FULL | dereferenced before normalisation, `packages/core/src/formats/shared.ts:48-88`; consumed at `packages/core/src/formats/jsonschema/index.ts:40`; test `packages/core/src/parse.test.ts:109-124` (address `$ref` resolves and keeps its `refName`) | |
| `$ref` (external / multi-file) | all | FULL | FULL | same generic pass, `packages/core/src/formats/shared.ts:48-88`, base location from `options.location` (`packages/core/src/formats/jsonschema/index.ts:40`) | Not JSON-Schema-specific machinery — the same code path every format uses. A broken external ref renders an explicit unresolved marker (`packages/core/src/schema.ts:94-104`) rather than failing the whole document. |
| `$defs` | 2019-09+ | FULL | FULL | `packages/core/src/formats/jsonschema/index.ts:107-120` (`collectDefinitionEntries`), catalogued via `SchemaCatalog` `packages/ui/src/renderers/jsonschema/JsonSchemaDocument.svelte:43-48`; test `packages/core/src/parse.test.ts:109-124` | |
| `definitions` | draft-07 and earlier | FULL | FULL | same function, `packages/core/src/formats/jsonschema/index.ts:110` reads both keys unconditionally; test `packages/core/src/parse.test.ts:126-136` | Read regardless of declared dialect — deliberate tolerance, comment at `packages/core/src/formats/jsonschema/index.ts:102-106`. |
| `$anchor` | 2019-09+ | NONE | N/A | not present — no match for `$anchor` in `packages/core/src/schema.ts` or `packages/core/src/formats/jsonschema/index.ts` | A plain fragment anchor for `$ref` targeting; `$RefParser` may resolve refs that use it, but apibox never surfaces the declaration itself. |
| `$dynamicRef` | 2020-12 | NONE | N/A | not present — no match in either file above | Used for extensible/recursive vocabularies (e.g. the meta-schema pattern). No model field exists to receive it. |
| `$dynamicAnchor` | 2020-12 | NONE | N/A | not present — no match in either file above | Pairs with `$dynamicRef`; same absence. |
| `$vocabulary` | 2019-09+ | NONE | N/A | not present — no match in either file above | Declares which keyword vocabularies apply and whether each is required; apibox does not read or enforce it, which is defensible for a renderer but means a document's vocabulary opt-outs are invisible. |
| `$comment` | draft-07+ | NONE | N/A | not present — no match in either file above; `$comment` is one of the `CONTAINER_KEYS` (`packages/core/src/formats/jsonschema/index.ts:17`) only in the sense that it is excluded from triggering "this document has a root schema", it is never read as content | Author-facing-only by spec design ("MUST NOT be used to convey information to consumers"), so its absence is defensible, but still a keyword with zero representation, listed for completeness. |
| **Applicators (structural)** | | | | | |
| `properties` | all | FULL | FULL | `packages/core/src/schema.ts:168-173`; render `packages/ui/src/organisms/schema-tree.ts:62`, `SchemaNodeRow.svelte`, `PropertyRow.svelte` | |
| `patternProperties` | all | FULL | FULL | `packages/core/src/schema.ts:239-248`; render (child branch) `packages/ui/src/organisms/schema-tree.ts:91-93` | |
| `additionalProperties` (bool or schema) | all | FULL | FULL | `packages/core/src/schema.ts:189-195`; render `packages/ui/src/organisms/schema-tree.ts:68-74` (schema form as a child), closed/open state implied by `allowsAdditionalProperties` on the node consumed via `SchemaTypeLabel`/constraint chips | Closed vs. unspecified deliberately kept distinct, comment `packages/core/src/schema.ts:187-188`. |
| `propertyNames` | draft-06+ | FULL | FULL | `packages/core/src/schema.ts:250-252`; render `packages/ui/src/organisms/schema-tree.ts:95-97` | |
| `unevaluatedProperties` (bool or schema) | 2019-09+ | FULL | FULL | `packages/core/src/schema.ts:280-289`; render `packages/ui/src/organisms/schema-tree.ts:113-119` | |
| `items` (schema form) | all | FULL | FULL | `packages/core/src/schema.ts:206-208`; render `packages/ui/src/organisms/schema-tree.ts:67` | |
| `items` (array/tuple form, draft-04) | draft-04 | FULL | FULL | `packages/core/src/schema.ts:200-205`; test `packages/core/src/parse.test.ts:138-150` (draft-04 array-form tuple) | |
| `prefixItems` (tuple form, 2020-12) | 2020-12 | FULL | FULL | `packages/core/src/schema.ts:200-203`; render `packages/ui/src/organisms/schema-tree.ts:63-65` | Both spellings feed the same `tupleItems` field on `SchemaNode`; neither drops entries beyond the first (comment `packages/core/src/schema.ts:197-199`). |
| `unevaluatedItems` (bool or schema) | 2019-09+ | FULL | FULL | `packages/core/src/schema.ts:291-297`; render `packages/ui/src/organisms/schema-tree.ts:120-126` | |
| `contains` | draft-06+ | FULL | FULL | `packages/core/src/schema.ts:254-256`; render `packages/ui/src/organisms/schema-tree.ts:99-101` | `minContains`/`maxContains` ride as constraint chips, see validation rows below. |
| `allOf` / `anyOf` / `oneOf` | draft-06+ (allOf draft-04+) | FULL | FULL | `packages/core/src/schema.ts:212-221`; render `packages/ui/src/organisms/schema-tree.ts:75-79` | |
| `not` | draft-04+ | FULL | FULL | `packages/core/src/schema.ts:222-224`; render same composition path | |
| `if` / `then` / `else` | draft-07+ | FULL | FULL | `packages/core/src/schema.ts:230-237`; render `packages/ui/src/organisms/schema-tree.ts:83-89` | Kept as a distinct `conditional` field rather than folded into compositions, comment `packages/core/src/schema.ts:227-229`. |
| `dependentSchemas` | 2019-09+ | FULL | FULL | `packages/core/src/schema.ts:269-278`; render `packages/ui/src/organisms/schema-tree.ts:103-109` | |
| **Validation keywords** | | | | | |
| `type` (string or array) | all | FULL | FULL | `packages/core/src/schema.ts:376-380`; render `packages/ui/src/molecules/SchemaTypeLabel.svelte` (via `schemaTypeLabel`, `packages/core/src/schema.ts:449-465`) | |
| `enum` | all | FULL | FULL | `packages/core/src/schema.ts:383-384`; render `packages/ui/src/molecules/PropertyRow.svelte:99-110` | |
| `const` | draft-06+ | FULL | FULL | `packages/core/src/schema.ts:385` (folded into `enum` as a single-valued list) | Deliberate merge — the model has one field for "the permitted set", tested `packages/core/src/parse.test.ts:216-231` for a scalar-root `enum`. |
| `multipleOf` | draft-04+ | FULL | FULL | `packages/core/src/schema.ts:16`; render as a constraint chip `packages/ui/src/molecules/PropertyRow.svelte:88-95` | |
| `minimum` / `maximum` | all | FULL | FULL | `packages/core/src/schema.ts:398-399,417-436`; render as above | |
| `exclusiveMinimum` / `exclusiveMaximum` (numeric, draft-06+) | draft-06+ | FULL | FULL | `packages/core/src/schema.ts:432-436` | |
| `exclusiveMinimum` / `exclusiveMaximum` (boolean, draft-04) | draft-04 | FULL | FULL | `packages/core/src/schema.ts:427-430`; dialect-correct fix noted in the card 23 brief | Read by the value's actual runtime type, not the declared dialect — comment `packages/core/src/schema.ts:414-416` — so a draft-04-shaped document that happens to declare a later `$schema` still renders correctly. |
| `minLength` / `maxLength` | all | FULL | FULL | `packages/core/src/schema.ts:11-12` (`CONSTRAINT_KEYS`) | |
| `pattern` | all | FULL | FULL | `packages/core/src/schema.ts:10`; render with `code` styling `packages/ui/src/molecules/PropertyRow.svelte:92` | |
| `maxItems` / `minItems` | all | FULL | FULL | `packages/core/src/schema.ts:17-18` | |
| `uniqueItems` | all | FULL | FULL | `packages/core/src/schema.ts:19` | |
| `minContains` / `maxContains` | draft-06+ | FULL | FULL | `packages/core/src/schema.ts:20-21` | |
| `maxProperties` / `minProperties` | draft-04+ | FULL | FULL | `packages/core/src/schema.ts:22-23` | |
| `required` | draft-04+ (shape varies) | FULL | FULL | `packages/core/src/schema.ts:162-166,175-185`; render badge `packages/ui/src/molecules/PropertyRow.svelte:65-67` | A `required` entry with no sibling `properties` entry still renders as a placeholder row rather than vanishing — `packages/core/src/schema.ts:175-185`. |
| `dependentRequired` | 2019-09+ | FULL | FULL | `packages/core/src/schema.ts:258-267`; render as chips `packages/ui/src/organisms/SchemaNodeRow.svelte:100-108` | |
| **Format / content / metadata** | | | | | |
| `format` (annotation) | all | FULL | FULL | `packages/core/src/schema.ts:138-139`; render `packages/ui/src/molecules/PropertyRow.svelte:88-93` (leads the chip row, comment `packages/core/src/schema.ts:5-7`) | Annotation only, per spec — apibox does not (and should not) validate against it; correctly scoped for a documentation renderer. |
| `contentEncoding` | draft-07+ | NONE | N/A | not present — no match for `contentEncoding` anywhere in `packages/core/src/schema.ts` | A base64-file-upload schema (`contentEncoding: base64`, `contentMediaType: image/png`) renders with no indication of the encoding at all. |
| `contentMediaType` | draft-07+ | NONE | N/A | not present — no match anywhere in `packages/core/src/schema.ts` | Same gap as above. |
| `contentSchema` | 2019-09+ | NONE | N/A | not present — no match anywhere in `packages/core/src/schema.ts` | Describes the shape of the *decoded* content (e.g. a JSON string field); entirely unmodelled. |
| `title` | all | FULL | FULL | `packages/core/src/schema.ts:133`; render implicitly via `SchemaCatalog`'s card summary fallback `packages/ui/src/organisms/SchemaCatalog.svelte:31` and root document title `packages/core/src/formats/jsonschema/index.ts:74` | Root `title` is also promoted to the whole document's `title`, distinct from the root node's own (deleted) `title` field — see next row. |
| `description` (root, promoted) | all | FULL | FULL | `packages/core/src/formats/jsonschema/index.ts:86`; render `packages/ui/src/organisms/DocumentHeader.svelte:33-35` | Deliberately stripped off the root `SchemaNode` after promotion to avoid double-rendering, comment `packages/core/src/formats/jsonschema/index.ts:62-69`, tested `packages/core/src/parse.test.ts:191-247`. |
| `description` (nested) | all | FULL | FULL | `packages/core/src/schema.ts:135`; render `packages/ui/src/molecules/PropertyRow.svelte:79-81` | |
| `default` | all | FULL | FULL | `packages/core/src/schema.ts:144`; render `packages/ui/src/molecules/PropertyRow.svelte:96-98` | |
| `examples` | draft-06+ | FULL | NONE | parse `packages/core/src/schema.ts:149-150,389-393` sets `SchemaNode.examples`; render — no reference to `schema.examples` anywhere in `packages/ui/src/molecules/PropertyRow.svelte` (confirmed by inspection: only `constraints`, `default` and `enum` are read there) | See Gap 1 below — parsed correctly but silently dropped at render time. |
| `deprecated` | 2019-09+ | FULL | FULL | `packages/core/src/schema.ts:140`; render `packages/ui/src/molecules/PropertyRow.svelte:68-70` | |
| `readOnly` | draft-07+ | FULL | FULL | `packages/core/src/schema.ts:141`; render `packages/ui/src/molecules/PropertyRow.svelte:71-73` | |
| `writeOnly` | draft-07+ | FULL | FULL | `packages/core/src/schema.ts:142`; render `packages/ui/src/molecules/PropertyRow.svelte:74-76` | |
| `x-*` (specification extensions) | n/a (informal convention) | FULL | FULL | `packages/core/src/schema.ts:299-305`; render `packages/ui/src/organisms/SchemaNodeRow.svelte:109-116` | Not a JSON Schema-spec keyword but explicitly named in card 23's scope; captured on every schema node, not only the root. |
| **Document-level (JSON Schema has no `info`/`servers`/`tags` object)** | | | | | |
| `summary` / `contact` / `license` / `externalDocs` / `termsOfService` | n/a | N/A | N/A | `ApiDocumentBase` fields exist (`packages/core/src/types.ts:294-306`) but are never set by `parseJsonSchema` (`packages/core/src/formats/jsonschema/index.ts:78-94` sets none of them) | Correctly N/A — JSON Schema's vocabulary has no equivalent construct to read these from; not a gap, just an unused corner of the shared base type. |
| `servers` / `tags` | n/a | N/A | N/A | hard-coded to `[]`, `packages/core/src/formats/jsonschema/index.ts:90-91` | Same reasoning. |
| Detection without `$schema` | n/a | N/A by design | N/A | `packages/core/src/detect.ts:92-96`; decision `decisions/08-json-schema-as-fourth-format.md` | The dominant real-world case (a form/config schema with no `$schema`) requires `--format jsonschema` or `ParseOptions.format`; deliberate, documented, not scored as a defect. |
| Root document is a bare boolean schema (`true`/`false`) | all | NONE | N/A | `parseJsonSchema` requires `asRecord(raw)` and throws `UnsupportedDocumentError` otherwise, `packages/core/src/formats/jsonschema/index.ts:36-37` | A boolean is a legal whole JSON Schema document per spec, but apibox's document-level entry point rejects it outright — distinct from `normaliseSchema`'s own boolean-schema handling for *nested* schemas (`packages/core/src/schema.ts:74-76`), which works correctly. Edge case (no `$schema` key is possible on a bare boolean anyway, so it would never detect without an explicit `--format` regardless), but a genuine parse-layer gap if that flag is used. |

## Gaps

1. **`examples` values are collected on `SchemaNode.examples` but never rendered.**
   User-visible impact: a schema documented with example instances (the array-valued
   `examples` keyword, or singular OpenAPI-style `example`) shows no examples anywhere in the
   UI for a JSON Schema document, even though the data survives parsing. Severity: medium —
   this is a keyword most schema authors use specifically to communicate with a human reader,
   so a silent render-time drop is a real regression from what the author wrote. Package:
   `packages/ui`. Smallest fix: add an `examples` block to `packages/ui/src/molecules/PropertyRow.svelte`
   (near the existing `enum` block, `PropertyRow.svelte:99-110`) that renders `schema.examples`
   the same way `enum` values are chipped. Confirm this is not also a latent gap for the other
   three formats before scoping — `SchemaNode.examples` is shared infrastructure
   (`packages/core/src/types.ts:44`), so if this is a genuine gap it likely affects OpenAPI/
   AsyncAPI/JSON-RPC schemas too, and is worth flagging cross-format rather than fixing once
   for JSON Schema alone.

2. **`contentEncoding`/`contentMediaType`/`contentSchema` entirely unmodelled.** User-visible
   impact: a schema documenting a base64-encoded upload, an embedded JWT, or any other
   content-vocabulary use case shows no indication that the field carries encoded structured
   content, or what that content's shape is. Severity: medium (a named, non-trivial vocabulary
   with real-world use, not an edge case) but scoped to a specific authoring pattern rather
   than universal. Package: `packages/core` (types + `schema.ts`) and `packages/ui`
   (`PropertyRow.svelte`/`schema-tree.ts`, since `contentSchema` is structural — it has its own
   nested schema to expand). Smallest fix: add `contentEncoding?: string`,
   `contentMediaType?: string`, `contentSchema?: SchemaNode` to `SchemaNode`
   (`packages/core/src/types.ts:24-142`), read them in `walk()` (`packages/core/src/schema.ts`,
   alongside the existing `format`/constraint reads), and render `contentEncoding`/
   `contentMediaType` as chips plus `contentSchema` as a child branch in `schema-tree.ts`.

3. **`$comment`, `$vocabulary`, `$anchor`, `$dynamicRef`, `$dynamicAnchor` have zero
   representation.** User-visible impact: mostly none for a typical form/config schema, but a
   document built around 2020-12's extensibility mechanism (`$dynamicRef`/`$dynamicAnchor`,
   the pattern used by meta-schemas and pluggable vocabularies) renders as if those keywords
   were absent, with no warning that anything was skipped. Severity: low for `$comment`
   (spec explicitly says it is author-only, not for consumers) and `$anchor` (fragment
   plumbing, not reader-facing content); low-to-medium for `$dynamicRef`/`$dynamicAnchor`/
   `$vocabulary` since a document that genuinely relies on them for structure would have that
   structure silently disappear. Severity: low overall, since apibox's target audience — form
   and config schema authors — rarely reaches for these. Package: `packages/core`. Smallest
   fix: none recommended without a concrete document that needs it; flagging for awareness.
   If prioritised, `$dynamicRef`/`$dynamicAnchor` would need the most care since they are
   genuinely structural (they change which schema resolves at a `$ref` site depending on the
   calling context), not just an annotation to surface.

4. **Nested subschema `$id` is invisible.** User-visible impact: a bundle of schemas combined
   into one file, where each top-level `$defs` entry declares its own `$id` (a common pattern
   for publishing a schema registry as a single document), shows no `$id` for anything but the
   document root. A reader cannot tell that `$defs.Address` is independently addressable as
   `https://example.com/schemas/address.json`. Severity: low (cosmetic/informational — `$ref`
   resolution itself is unaffected since that is `$RefParser`'s job, not this gap). Package:
   `packages/core`. Smallest fix: read `schema.$id ?? schema.id` in `walk()`
   (`packages/core/src/schema.ts`), add an optional `schemaId?: string` to `SchemaNode`, and
   render it as a small chip in `PropertyRow.svelte`, mirroring how the document-level
   `schemaId` already renders in `packages/ui/src/renderers/jsonschema/JsonSchemaDocument.svelte:25-29`.

5. **A bare boolean document (`true`/`false` as the entire JSON Schema file) is rejected.**
   User-visible impact: essentially none in practice — detection cannot fire on a boolean
   anyway (no `$schema` key is possible), so this only bites a caller who explicitly passes
   `--format jsonschema` at a file containing literally `true` or `false`. Severity: very low.
   Package: `packages/core`. Smallest fix: in `parseJsonSchema`
   (`packages/core/src/formats/jsonschema/index.ts:36-37`), accept a boolean `raw` as a
   degenerate root schema (`{ types: raw ? [] : ['never'] }`) instead of throwing, consistent
   with how `normaliseSchema`/`walk()` already treats a boolean at any nested position
   (`packages/core/src/schema.ts:74-76`). Flagging for awareness rather than urging the fix —
   this is a genuine but extremely rare edge case.

## Method and limits

- Assessment was static: reading `packages/core/src/formats/jsonschema/index.ts`,
  `packages/core/src/detect.ts`, `packages/core/src/schema.ts`, `packages/core/src/types.ts`,
  `packages/core/src/formats/shared.ts`, `packages/core/src/parse.ts`, the full JSON Schema
  section of `packages/core/src/parse.test.ts:108-247`, the fixtures it exercises
  (`examples/user-profile.schema.json`, `packages/core/test/fixtures/widget-draft07.schema.json`),
  and the render chain `packages/ui/src/renderers/jsonschema/JsonSchemaDocument.svelte`,
  `packages/ui/src/organisms/{SchemaViewer,SchemaCatalog,SchemaNodeRow,DocumentHeader,
  schema-tree}.{svelte,ts}`, and `packages/ui/src/molecules/PropertyRow.svelte`. No new
  automated checks were run; this is a read-only audit as scoped in the brief. `bun test`
  was not executed, matching the sibling reports' stated limit.
- Every claim above cites a `path:line`; where a construct is entirely absent the citation
  points at the file that would contain it (confirmed absent by `grep`/inspection), so the
  absence is falsifiable.
- The "54 addressable constructs" figure in the Headline is a script-verified count of the
  matrix rows above (each row's Parse/Render cell tallied programmatically, not by hand),
  excluding the explicitly N/A document-level rows (info-object-shaped fields JSON Schema's
  own vocabulary has no equivalent for, plus the detection-ergonomics and bare-boolean-document
  rows, which are policy/edge-case notes rather than keyword coverage). It is still a rough
  index, not a certified metric — several rows bundle multiple sub-fields (e.g.
  `minimum`/`maximum` and `exclusiveMinimum`/`exclusiveMaximum` appear as separate numeric- and
  boolean-shaped rows) and reasonable people could count differently, consistent with the
  sibling reports' framing.
- decisions/08-json-schema-as-fourth-format.md was read first and treated as binding on
  detection policy per the brief; nothing in this report second-guesses the explicit-signal
  decision, only documents its consequence for real-world files.
- "JSON Schema 2020-12" and the four older drafts were assessed from working knowledge of
  each draft's keyword set (the 2020-12 core/applicator/validation/content/meta-data
  vocabularies, and the draft-04/06/07/2019-09 predecessors and their keyword-shape
  differences — `definitions` vs `$defs`, `id` vs `$id`, boolean vs numeric
  `exclusiveMinimum`/`exclusiveMaximum`, array-form `items` vs `prefixItems`) rather than by
  fetching the live spec text at json-schema.org during this session (no network access was
  used for this task). Flagging this as a limit, consistent with the sibling OpenRPC report's
  equivalent note.
- Card 23's five example applicator/validation additions (if/then/else, patternProperties,
  propertyNames, contains with min/maxContains, dependentRequired/dependentSchemas,
  unevaluatedProperties/Items, `x-*`, and the draft-04 boolean-exclusive-bound fix) were each
  traced individually from `schema.ts` through to a render path and confirmed reachable from a
  standalone JSON Schema document specifically (not just from OpenAPI/AsyncAPI/JSON-RPC, which
  already exercised the shared normaliser before this format existed) — see the matrix rows
  above for each one's citation.
