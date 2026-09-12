---
title: JSON-RPC / OpenRPC coverage
---
# OpenRPC specification coverage

Re-assessed 2026-09-12 against [OpenRPC 1.3.2](https://spec.open-rpc.org/), against the
current code (post card-22). The previous version of this document, dated 2026-09-11,
scored the parse layer at ~64% FULL; that figure is now stale. Since that assessment landed:
`method.links` (the Link Object, `RpcLink`), `method.servers` overrides, `method.externalDocs`,
`result.deprecated`, per-parameter `deprecated` render, root and per-method `x-*`
extensions, tag `description`/`externalDocs` (parse side), server `variables`, `info.summary`,
root `externalDocs`, and the `specVersion` fallback moving from `1.2.6` to `1.3.2` have all
landed. Confirmed by reading `packages/core/src/formats/jsonrpc/index.ts` in full (319
lines), the relevant `packages/core/src/types.ts` interfaces, the UI renderers under
`packages/ui/src/renderers/jsonrpc/`, and by running the existing test suite
(`bun test packages/core/src/parse.test.ts` → 114 pass, 0 fail).

> **Superseded 2026-09-12.** Cards 38 to 44 closed every gap this report lists, including
> the rows scored NONE below. Constructs previously recorded as deliberate omissions —
> `$comment`, `$vocabulary`, the OpenRPC component catalogues, AsyncAPI channel tags and
> external docs, and webhook `operationRef` resolution — were re-examined, found to be
> editorial judgements rather than technical limits, and implemented. Treat the matrix below
> as the state at audit time, not as current. Re-audit before citing any figure from it.

## Headline

Almost every construct that was NONE in the previous assessment is now FULL at the parse
layer. The render layer has mostly kept pace, with one confirmed, deliberate exception: tag
`description`/`externalDocs` are parsed in full but never rendered, because a tag's heading
in the UI comes from `NavNode.label` (a bare string built by `buildNav`,
`packages/core/src/formats/jsonrpc/index.ts:293-319`), and the OpenRPC renderer's group
heading is literally `{group.node.label}` (`packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:39`)
with no path from `TagInfo.description`/`externalDocs` into that heading or anywhere else on
the page. This is the render-layer gap the brief asked to specifically verify, and it is
still there — but it is a **PARTIAL**, not a NONE: a tag still shows up as a group label, it
just carries none of its own metadata. There is no construct in this matrix that is fully
parsed yet renders nothing at all.

The matrix below has 58 substantive construct rows (every non-header, non-N/A row —
including the 7-row JSON Schema section, which the previous assessment's headline arithmetic
also included). This is more than the previous assessment's "~45", not because more
constructs were added to the list, but because that figure under-counted the rows already
present in its own matrix; the underlying construct list is otherwise the same one carried
forward, per the brief.

- **Parse layer**: 43 FULL, 13 PARTIAL, 2 NONE, out of 58 → 43/58 = 74% FULL, 13/58 = 22%
  PARTIAL, 2/58 = 3% NONE.
- **Render layer**: computed over the 55 rows where rendering is applicable (excluding the
  2 parse-NONE rows, which have nothing to render, and the `Server.name` row, which is
  deliberately not displayed by design — see its own row's Notes): 42 FULL, 13 PARTIAL,
  0 NONE → 42/55 = 76% FULL, 13/55 = 24% PARTIAL, 0% NONE.

The 2 parse-layer NONEs are `info.termsOfService` and the Example Object's `externalValue`.
`termsOfService` is modelled on `ApiDocumentBase` (`packages/core/src/types.ts:302`), rendered
by `DocumentHeader.svelte:72-78` when present, and already populated by the AsyncAPI parser
(`packages/core/src/formats/asyncapi/index.ts:304`) — but never read by `parseJsonRpc`
(confirmed: no `termsOfService` reference anywhere in `packages/core/src/formats/jsonrpc/index.ts`).
`externalValue` is never read by `parseExamples` either (confirmed by reading the function in
full).

The 13 render-layer PARTIALs are: three rollup rows (`info`, `components`, `x-*`
extensions — themselves PARTIAL only because their sub-rows are), the pre-existing
"summary collapsed into description" merges (Server, ContentDescriptor, Example/ExamplePairing
— 4 rows), the generic-`$ref`-only component buckets that lack a dedicated catalogue
(`contentDescriptors`, `examples`, `links`, `examplePairings` — 4 rows), and the two tag rows
(inline `tags` and `components.tags`) that carry the confirmed render gap described above.
That is 3 + 4 + 4 + 2 = 13.

Plain (non-OpenRPC) JSON-RPC 2.0 documents — a bare request/response/batch payload with no
`openrpc` marker — are still not a supported input at all: `detectFormat` only recognises an
`openrpc` version key (`packages/core/src/detect.ts:85-86`), so such a file returns
`undefined` and fails with "unrecognised document" rather than being described. Unchanged
from the previous assessment and, as before, a defensible scope boundary rather than a
defect: apibox is a documentation renderer for an interface *description* format, not a
JSON-RPC traffic inspector.

## Coverage matrix

| Construct | Parse | Render | Evidence (path:line) | Notes |
|---|---|---|---|---|
| **OpenRPC Object** | | | | |
| `openrpc` (version) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:64`; detect: `packages/core/src/detect.ts:85-86`; render: `packages/ui/src/organisms/DocumentHeader.svelte:31` | Falls back to `'1.3.2'` when absent (moved up from the previous `'1.2.6'`), confirmed by test `packages/core/src/parse.test.ts:2045-2050`. |
| `info` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:49-79` | See Info sub-rows. Only gap remaining is `termsOfService`. |
| `servers` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:72,90-100`; render `packages/ui/src/organisms/ServerList.svelte:16-46` | Upgraded from PARTIAL: `variables` are now parsed (`parseServerVariables`, `packages/core/src/formats/jsonrpc/index.ts:107-126`) and rendered (`ServerList.svelte:26-33`); test `packages/core/src/parse.test.ts:1993-2003`. |
| `methods` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:55,128-186`; render `packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:36-44` | |
| `components` | PARTIAL | PARTIAL | see Components sub-rows | Only `components.schemas` is a first-class, named, browsable collection; the other buckets are reachable only indirectly via generic `$ref` resolution. |
| `externalDocs` (root) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:71` via shared `parseExternalDocs`; render `DocumentHeader.svelte:65-71`; test `packages/core/src/parse.test.ts:1981-1987` | Upgraded from NONE. |
| Specification extensions (`x-*`) anywhere in an OpenRPC doc | PARTIAL | PARTIAL | root: `packages/core/src/formats/jsonrpc/index.ts:78,83-88`, render `packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:22-33`; method: `packages/core/src/formats/jsonrpc/index.ts:183`, render `RpcMethodCard.svelte:39-50`; test `packages/core/src/parse.test.ts:1981,1985` (`doc.extensions`) | Upgraded from NONE, but only at document-root and Method-object level. `RpcParam`, `RpcError`, `RpcExample`, `RpcLink`, `ServerInfo`, and `TagInfo` have no `extensions` field (`packages/core/src/types.ts:204-236,261-265,657-696`), so `x-*` on a param, error, example, link, server, or tag is silently dropped even though the mechanism (`isExtensionKey`, `packages/core/src/formats/shared.ts:293-295`) is generic and already proven at two levels. |
| **Info Object** | | | | |
| `title` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:50`; render `DocumentHeader.svelte:31` | |
| `version` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:66`; render `DocumentHeader.svelte:38` | |
| `description` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:68`; render `DocumentHeader.svelte:33-35` | |
| `summary` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:67`; render `DocumentHeader.svelte:32`; test `packages/core/src/parse.test.ts:1981-1982` | Upgraded from NONE. |
| `termsOfService` | NONE | N/A (would render if set) | not read anywhere in `packages/core/src/formats/jsonrpc/index.ts` (confirmed by full-file inspection); contrast AsyncAPI, which does: `packages/core/src/formats/asyncapi/index.ts:304` | `ApiDocumentBase.termsOfService` exists (`packages/core/src/types.ts:302`) and `DocumentHeader.svelte:72-78` renders it when present — the field is simply never populated for this format. The one remaining parse-layer NONE. |
| `contact` (name, url, email) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:69` via `parseContact`, `packages/core/src/formats/shared.ts:255-263`; render `DocumentHeader.svelte:39-53` | |
| `license` (name, url, identifier) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:70` via `parseLicense`, `packages/core/src/formats/shared.ts:265-277`; render `DocumentHeader.svelte:54-64` | SPDX `identifier` mapped to `spdx.org` URL. |
| **Server Object** | | | | |
| `name` | FULL | not displayed directly | `packages/core/src/formats/jsonrpc/index.ts:95` | `ServerList.svelte` shows `url`/`description`/`variables`/`security`/`bindings`, not `name`, by design — same as previous assessment. |
| `url` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:96`; render `ServerList.svelte:19` | |
| `summary` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:97` (`asString(entry.summary) ?? asString(entry.description)`) | Still collapsed into `description`, unchanged from previous assessment. |
| `description` | FULL (merged with summary) | FULL | `packages/core/src/formats/jsonrpc/index.ts:97`; render `ServerList.svelte:20` | |
| `variables` | FULL | FULL | `parseServerVariables`, `packages/core/src/formats/jsonrpc/index.ts:107-126`, called at `:98`; render `ServerList.svelte:26-33`; test `packages/core/src/parse.test.ts:1993-2003` | Upgraded from NONE — the previous assessment's single biggest cited gap. |
| **Method Object** | | | | |
| `name` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:142,146`; render `RpcMethodCard.svelte:22` | |
| `tags` (full Tag Object: name, description, externalDocs) | FULL | PARTIAL | parse: `packages/core/src/formats/jsonrpc/index.ts:151-167` builds `tagInfoByName` with `description`/`externalDocs`, surfaced on `doc.tags` (`TagInfo[]`); test `packages/core/src/parse.test.ts:2005-2010` and (via `$ref` to `components.tags`) `:2053-2069`. Render: nav group heading is `{group.node.label}` only, `packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:39`; `buildNav` (`packages/core/src/formats/jsonrpc/index.ts:293-319`) builds `NavNode` with `label` only, never carrying `description`/`externalDocs` through. No other place in the UI (method card, document header) shows tag metadata either — confirmed by reading `RpcMethodCard.svelte` in full, which never references `method.tags`. | **Confirmed carried gap** — parse is now FULL (upgraded from PARTIAL previously) but render remains the one confirmed NONE-at-render construct in this document, exactly as the brief anticipated. `RpcMethod.tags` itself is still `string[]` (names only, `packages/core/src/types.ts:704`); the full `TagInfo` lives on `JsonRpcDocument.tags`, not per-method. |
| `summary` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:148`; render `RpcMethodCard.svelte:28-30` | |
| `description` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:149`; render `RpcMethodCard.svelte:31` | |
| `externalDocs` (method) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:182`; render `RpcMethodCard.svelte:32-38`; test `packages/core/src/parse.test.ts:2020-2029` | Upgraded from NONE. |
| `params` (ContentDescriptor[]) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:169,225-236`; render `RpcMethodCard.svelte:52-81` | |
| `result` (ContentDescriptor \| Reference) | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:170-177`; render `RpcMethodCard.svelte:83-98` | `result.summary` is still collapsed into `description` (`:173`), same lossy merge as before. `result.deprecated`, previously NONE, is now captured and rendered — see its own row below — so this row's remaining gap is the summary/description merge only. |
| `errors` (Error Object[] \| Reference[]) | FULL (code/message), PARTIAL (`data` treated as `schema`) | FULL | `packages/core/src/formats/jsonrpc/index.ts:178,238-248`; render `RpcMethodCard.svelte:100-123` | Unchanged: `data` is normalised through `normaliseSchema` even though the spec defines it as "a Primitive or Structured value", not necessarily schema-shaped. Judged a reasonable rendering approximation, not scored as a defect, same as previously. |
| `deprecated` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:150`; render `RpcMethodCard.svelte:21` | |
| `paramStructure` (`by-name`\|`by-position`\|`either`) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:168,221-223`; render `RpcMethodCard.svelte:23-25`; default-to-`either` verified by test `packages/core/src/parse.test.ts:1920-1922` | |
| `examples` (ExamplePairing[]) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:179,250-278`; render `packages/ui/src/renderers/jsonrpc/RpcExamplePair.svelte`; tests `packages/core/src/parse.test.ts:1910-1957` | |
| `servers` (method-level override) | FULL | FULL | parse: `packages/core/src/formats/jsonrpc/index.ts:144,181`; render `RpcMethodCard.svelte:172-174`; test `packages/core/src/parse.test.ts:2022-2029` | Upgraded from NONE. |
| `links` (Link Object[] \| Reference[]) | FULL | FULL | type `RpcLink` (`packages/core/src/types.ts:686-696`); parse `parseLinks`, `packages/core/src/formats/jsonrpc/index.ts:193-218`, called at `:180`; render `RpcMethodCard.svelte:138-170`; test `packages/core/src/parse.test.ts:2012-2019` | Upgraded from NONE — this was the previous assessment's headline "named, non-trivial OpenRPC feature" gap; it is now fully modelled including `name`, `description`, `summary`, `method`, `params` (as a name/value list, declaration order preserved), and `server` (full `ServerInfo` including `variables`). |
| **ContentDescriptor Object (params/result)** | | | | |
| `name` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:230,171`; render `RpcMethodCard.svelte:57-58,86` | |
| `summary` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:231,172` | Still merged into `description`, unchanged. |
| `description` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:231,172`; render `RpcMethodCard.svelte:68-72,93-95` | |
| `required` (params only) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:232`; render `RpcMethodCard.svelte:58` | |
| `schema` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:234,173`; render via `SchemaViewer` `RpcMethodCard.svelte:73-77,96` | |
| `deprecated` (params) | FULL | FULL | parse: `packages/core/src/formats/jsonrpc/index.ts:233`; render: dedicated badge, `RpcMethodCard.svelte:59-66`; test `packages/core/src/parse.test.ts:2036-2041` | Upgraded to FULL render — the previous assessment's "parsed but not visibly badged" gap is closed; there is now a per-parameter `deprecated` outline badge distinct from the method-level badge. |
| `deprecated` (result) | FULL | FULL | parse: `packages/core/src/formats/jsonrpc/index.ts:175`; render: `RpcMethodCard.svelte:85-91`; test `packages/core/src/parse.test.ts:2031-2035` | Upgraded from NONE. |
| **Example Object / ExamplePairing Object** | | | | |
| `name` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:270`; render `RpcExamplePair.svelte:15` | |
| `description`/`summary` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:271` | Still merged, unchanged. |
| `params` (Example[]) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:257-266,272-274`; render `RpcExamplePair.svelte:20-27` | Reconstructs a real by-name/by-position payload rather than echoing raw Example Objects, deliberately, per comment at `:255-256`. |
| `result` (Example) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:267,275`; render `RpcExamplePair.svelte:28-34` | |
| Example Object `externalValue` | NONE | N/A (nowhere to render) | parsing never reads `entry.result.externalValue` or `param.externalValue`; confirmed by reading `parseExamples` in full, `packages/core/src/formats/jsonrpc/index.ts:250-278`, which only ever accesses `.value` | Unchanged from previous assessment. Rare in practice (inline `value` is the common case) but a genuine spec field, still not modelled. |
| **Components Object** | | | | |
| `components.schemas` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:56` via `parseComponentSchemas`, `packages/core/src/formats/shared.ts:229-238`; render `packages/ui/src/organisms/SchemaCatalog.svelte`, nav `packages/core/src/formats/jsonrpc/index.ts:315-316` | Named, catalogued, cross-referenced by `refName`. Unchanged. |
| `components.contentDescriptors` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | reachable only because `dereferenceDocument` (`packages/core/src/formats/shared.ts:48-83`) resolves *all* `$ref`s generically, not via any OpenRPC-specific handling | Unchanged: not separately catalogued/named; `collectComponentNames` (`packages/core/src/formats/shared.ts:219-227`) only maps `components.schemas`. |
| `components.examples` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | same generic mechanism | Unchanged. |
| `components.links` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | `parseLinks` (`packages/core/src/formats/jsonrpc/index.ts:193-218`) reads `entry.links` from the already-dereferenced document, so a `$ref` to `components.links.X` resolves and renders the same as an inline link | Upgraded from NONE (there was previously no `links` field at all to receive it). No dedicated catalogue, same limitation as the other component buckets — not independently tested against this fixture, inferred from the generic dereference mechanism proven for `components.errors` (below). |
| `components.errors` | PARTIAL (via `$ref`) | FULL once resolved | `parseErrors` (`packages/core/src/formats/jsonrpc/index.ts:238-248`) reads whatever is at `entry.errors[i]` post-dereference | Unchanged: no separate errors catalogue/nav section. |
| `components.examplePairings` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | same generic mechanism; `parseExamples` works on the resolved object regardless of origin | Unchanged. |
| `components.tags` | FULL (via `$ref`, full object) | PARTIAL | parse: test `packages/core/src/parse.test.ts:2053-2069` proves a `$ref` to `components.tags.shared` resolves with `description` intact and is deduplicated across methods; render: same nav-label-only gap as inline tags, above | Upgraded parse from PARTIAL (names only) to FULL; render remains the one confirmed render gap in this document. |
| **JSON Schema (draft-07 / 2019-09 as used by OpenRPC)** | | | | |
| `type`, `properties`, `required`, `items`/`prefixItems` | FULL | FULL | `packages/core/src/schema.ts:162-210` (`normaliseSchema`/`walk`, defined from `:53`) | Shared with OpenAPI/AsyncAPI via `normaliseSchema`. |
| `enum`, `const` | FULL | FULL | `packages/core/src/schema.ts:146-147,383-386` (`toEnum`) | |
| `oneOf`/`anyOf`/`allOf`/`not` | FULL | FULL | `packages/core/src/schema.ts:211-238` | |
| `additionalProperties` (bool or schema) | FULL | FULL | `packages/core/src/schema.ts:189-196` | |
| `format`, `pattern`, `minLength`/`maxLength`, `minimum`/`maximum`, `exclusiveMin/Max`, `multipleOf`, `min/maxItems`, `uniqueItems`, `min/maxProperties` | FULL | FULL | `packages/core/src/schema.ts:8-23` (`CONSTRAINT_KEYS`), applied via `toConstraints`, `packages/core/src/schema.ts:396-` | Rendered as constraint chips. |
| `$ref` (internal & external) | FULL | FULL | dereferenced pre-normalisation, `packages/core/src/formats/shared.ts:48-83`; unresolved refs rendered explicitly `packages/core/src/schema.ts:93-103` | Circular refs handled without infinite recursion, `packages/core/src/schema.ts:105-114`. |
| `title`, `description`, `deprecated`, `readOnly`, `writeOnly`, `default`, `examples`/`example`, `nullable`/`type: [..,'null']` | FULL | FULL | `packages/core/src/schema.ts:133-150` | |
| **JSON-RPC 2.0 transport semantics (not OpenRPC document fields)** | | | | |
| Notifications (request without `id`) | N/A | N/A | no field for this anywhere — OpenRPC's Method Object does not declare whether a method may be called as a notification; that is a per-*request* choice at call time, not a document-level construct | Correctly out of scope for a static description format. Unchanged. |
| Batch requests (JSON array of requests) | N/A | N/A | no batch concept in the OpenRPC Method/Example model | Unchanged. |
| Reserved error codes (-32700..-32603 etc.) | N/A | N/A | `RpcError.code` rendered verbatim (`RpcMethodCard.svelte:105-107`) with no special-casing of the reserved range | Not a spec requirement to special-case. Unchanged. |
| Detection of *plain* (non-OpenRPC) JSON-RPC docs | NONE (by design) | N/A | `detectFormat` requires an `openrpc` key, `packages/core/src/detect.ts:85-86`; a bare JSON-RPC request/response object returns `undefined` and fails as "unrecognised document" | Reasonable scope boundary, unchanged. |

## Gaps

1. **Tag `description`/`externalDocs` parsed in full but never rendered anywhere.**
   Severity: low-medium (the data now genuinely exists on `JsonRpcDocument.tags`, so this is
   now a pure render gap, not a parse gap). User-visible impact: a document that invests in
   rich Tag Objects — a description of what "accounts" methods have in common, a link to
   further docs — gets a bare, unexplained group label in the sidebar/section heading.
   Package: `packages/ui` (mechanically) or `packages/core` (if `buildNav` needs to carry the
   metadata through `NavNode`, since `NavNode` currently has no `description`/`externalDocs`
   field either, `packages/core/src/types.ts:274-284`). Smallest fix: render `document.tags`
   metadata directly above each `<section>` group in `JsonRpcDocument.svelte:38-44`
   (the document already has `document.tags: TagInfo[]` available as a prop-level import —
   no parser change needed, only a lookup by `group.node.label` and a small UI addition),
   rather than trying to route it through `NavNode`, which is shared navigation
   infrastructure used by other formats too and shouldn't gain OpenRPC-specific fields.

2. **`info.termsOfService` not parsed for JSON-RPC.** Severity: low (uncommon field; already
   modelled generically and already implemented for AsyncAPI, so the pattern to copy exists).
   User-visible impact: a document that sets a terms-of-service URL never shows the "Terms of
   service" row that `DocumentHeader.svelte:72-78` already knows how to render. Package:
   `packages/core`. Smallest fix: add `termsOfService: asString(info.termsOfService)` to the
   returned object in `packages/core/src/formats/jsonrpc/index.ts:58-79`, mirroring
   `packages/core/src/formats/asyncapi/index.ts:304`.

3. **`x-*` extensions only captured at document root and Method Object level.** Severity: low
   (extensions are optional/informal by spec design, and the two levels that matter most —
   the whole document and each method — are covered). User-visible impact: a vendor
   extension on a param, error, example, link, server, or tag is silently dropped even though
   the exact same mechanism (`isExtensionKey`) already exists and is proven at two levels.
   Package: `packages/core` (+ `packages/ui` if new UI is wanted per object type). Smallest
   fix: none recommended without a concrete reader need — flagging for awareness. If ever
   prioritised, `RpcParam`/`RpcError`/`RpcExample`/`RpcLink`/`ServerInfo`/`TagInfo` would each
   need an `extensions?` field and a `parseExtensions(entry)` call at their construction
   sites.

4. **No separate catalogue for `components.contentDescriptors`, `components.examples`,
   `components.examplePairings`, `components.links`, and `components.tags`.** Severity: low
   (schemas — the highest-value bucket — already have this; every other bucket still renders
   correctly at its point of use via generic `$ref` resolution, so nothing is silently
   dropped, only undiscoverable independent of a method that references it). Package:
   `packages/core` + `packages/ui`. Smallest fix: none recommended unless a reader need is
   identified; flagging for awareness, same posture as the previous assessment.

5. **ContentDescriptor/Server/Example `summary` still collapsed into `description`
   everywhere.** Severity: low (informational loss only — nothing is dropped, the two
   strings are just concatenated/coalesced rather than shown as distinct fields). Package:
   `packages/core` + `packages/ui`. Smallest fix: none recommended as a priority; this is a
   deliberate, consistent simplification across every JSON-RPC construct that has both
   fields, not an oversight specific to one of them, and unpicking it touches five call sites
   (Server, ContentDescriptor ×2, Example/ExamplePairing) for a low-value distinction.

6. **Example Object `externalValue` not modelled.** Severity: low (rare in practice — inline
   `value` is the common case). Package: `packages/core`. Smallest fix: in `parseExamples`
   (`packages/core/src/formats/jsonrpc/index.ts:250-278`), when a param/result entry has no
   `value` but does have `externalValue`, surface it (e.g. as a string placeholder rather
   than a fetched value, since apibox does not fetch external resources during parsing).

## Method and limits

- Assessment was static: reading `packages/core/src/formats/jsonrpc/index.ts` in full (all
  319 lines), `packages/core/src/formats/shared.ts`, `packages/core/src/schema.ts`,
  `packages/core/src/types.ts`, `packages/core/src/detect.ts`, and the renderers
  `packages/ui/src/renderers/jsonrpc/{JsonRpcDocument,RpcMethodCard,RpcExamplePair}.svelte`
  and `packages/ui/src/organisms/{DocumentHeader,ServerList,SchemaCatalog,SchemaViewer}.svelte`,
  cross-checked against the existing test suite `packages/core/src/parse.test.ts:1876-2071`
  and the fixture `examples/wallet.openrpc.json`.
- `bun test packages/core/src/parse.test.ts` was run as part of this assessment (114 pass,
  0 fail, 282 expect() calls) to confirm the parse-layer claims above are exercised by
  passing tests, not just plausible from reading the code. No UI/render test run exists for
  the JSON-RPC renderer specifically (no `*.test.ts` under
  `packages/ui/src/renderers/jsonrpc/`), so every render-layer claim above is verified by
  reading the `.svelte` source directly rather than by a passing assertion — this is the
  weakest link in this assessment and is flagged rather than glossed over.
- Every claim above cites a `path:line`; where a construct is entirely absent, the citation
  points at the place it *would* live (a type definition, a sibling format's equivalent
  line, or the function that was searched in full and confirmed not to reference it).
- The `components.links` PARTIAL-render claim is inferred from the generic dereference
  mechanism (proven for `components.errors`, `.examples`, `.examplePairings`,
  `.contentDescriptors`, and `.tags` by direct test coverage) rather than from a test that
  specifically exercises a `$ref` into `components.links`. Flagged as inference, not
  observation, in that row.
- The percentage figures in the Headline are a manual count of the 58 matrix rows above
  (verified by script: `awk` over the table excluding section-header rows and the four rows
  under "JSON-RPC 2.0 transport semantics", which are N/A because they are not OpenRPC
  document constructs, and excluding the plain-JSON-RPC detection row, also N/A-by-design).
  Two counting decisions affect the tally and are stated here rather than left implicit:
  the `errors` row's `data`-treated-as-`schema` caveat is counted as parse PARTIAL (render
  FULL), and `components.errors` is counted the same way (PARTIAL parse via generic `$ref`,
  FULL render once resolved) — both because a sub-field is not literally spec-shaped, not
  because anything is dropped. The `Server.name` row is excluded from the render denominator
  entirely (55 rather than 58) because it is a deliberate design choice not to display it,
  not an unrendered gap. These are a rough index — several rows bundle multiple sub-fields
  (e.g. the ContentDescriptor rows appear twice, once for params and once for result) — not a
  certified metric, same caveat as the previous assessment.
- "OpenRPC 1.3.2" was assessed from working knowledge of the specification's object model
  (Info, Server/ServerVariable, Method, ContentDescriptor, Example/ExamplePairing, Link,
  Error, Components, Tag, ExternalDocs, Reference) rather than by fetching the live spec text
  at spec.open-rpc.org during this session (no network access was used). Flagging this as a
  limit rather than treating it as verified against the current published text line-by-line
  — unchanged caveat from the previous assessment.
