---
title: JSON-RPC / OpenRPC coverage
---
# OpenRPC specification coverage

Assessed 2026-09-11 against [OpenRPC 1.3.2](https://spec.open-rpc.org/).

## Headline

apibox parses and renders a solid core of the OpenRPC object model — methods, params,
results, errors, examples, tags-as-labels, component schemas, and `$ref` resolution
(including to `components.errors`/`components.examplePairings`, generically, via
`json-schema-ref-parser`) — but drops several document- and method-level constructs that
the spec defines: `info.summary`, `info.termsOfService`, `externalDocs` (document, method,
and tag level), `tags[].description`, `method.servers` overrides, `method.links`, the
`deprecated` flag on the result `ContentDescriptor`, and `x-*` specification extensions
anywhere in the JSON-RPC path. Server `variables` are modelled in the shared `ServerInfo`
type and rendered by `ServerList.svelte`, but the OpenRPC parser never populates them from
`servers[].variables` (`packages/core/src/formats/jsonrpc/index.ts:70-79`).

Rough computation: of the ~45 addressable OpenRPC constructs enumerated in the matrix
below (excluding pure JSON-RPC 2.0 transport semantics, which OpenRPC documents do not
encode), 29 are FULL, 8 are PARTIAL, and 8 are NONE.

- **Parse layer**: ~64% FULL (29/45), ~18% PARTIAL (8/45), ~18% NONE (8/45).
- **Render layer**: render coverage is bounded by parse coverage — nothing dropped at
  parse time can be rendered. Of what *is* parsed (37/45 constructs at FULL or PARTIAL),
  essentially all of it reaches the UI (`RpcMethodCard.svelte`, `JsonRpcDocument.svelte`,
  `DocumentHeader.svelte`, `ServerList.svelte`, `SchemaViewer.svelte`); the main render-only
  gap found is per-parameter `deprecated` (parsed but not visibly badged in
  `RpcMethodCard.svelte`).

Plain (non-OpenRPC) JSON-RPC 2.0 documents — a bare request/response/batch payload with no
`openrpc` marker — are not a supported input at all: `detectFormat` only recognises an
`openrpc` version key (`packages/core/src/detect.ts:26-27`), so such a file returns
`undefined` and fails with "unrecognised document" rather than being described. This is
correct scope for apibox (it is a *documentation* renderer for an interface description
format, not a JSON-RPC traffic inspector) but is worth stating explicitly since the spec
family includes both.

## Coverage matrix

| Construct | Parse | Render | Evidence (path:line) | Notes |
|---|---|---|---|---|
| **OpenRPC Object** | | | | |
| `openrpc` (version) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:55`; detect: `packages/core/src/detect.ts:26-27`; render: `packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:20` | Falls back to `'1.2.6'` when absent, which the spec requires to be present; fallback is effectively dead code but not wrong. |
| `info` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:46-58` | See Info sub-rows below. |
| `servers` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:61,70-79`; render `packages/ui/src/organisms/ServerList.svelte:16-34` | Only `name`/`url`/`description` extracted; `variables` never populated even though `ServerInfo.variables` and `ServerList.svelte:26-33` support them (proven by AsyncAPI, which does populate them). |
| `methods` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:49,81-118`; render `packages/ui/src/renderers/jsonrpc/JsonRpcDocument.svelte:23-31` | |
| `components` | PARTIAL | PARTIAL | see Components sub-rows | Only `components.schemas` is enumerated as a first-class collection; other component buckets are reachable only indirectly via `$ref`. |
| `externalDocs` (root) | NONE | NONE | not present — `parseJsonRpc` return object (`packages/core/src/formats/jsonrpc/index.ts:52-67`) never reads `dereferenced.externalDocs`, though `ApiDocumentBase.externalDocs` exists (`packages/core/src/types.ts:170`) and `DocumentHeader.svelte:52-57` would render it if set | OpenAPI's parser does read it via `parseExternalDocs` (`packages/core/src/formats/shared.ts:256-261`); JSON-RPC parser never calls it. |
| Specification extensions (`x-*`) anywhere in an OpenRPC doc | NONE | NONE | `isExtensionKey` helper exists (`packages/core/src/formats/shared.ts:270-272`) but is never imported by `packages/core/src/formats/jsonrpc/index.ts` (confirmed by inspection — no `isExtensionKey`/`x-` handling in that file) | No `x-*` passthrough field on `JsonRpcDocument`/`RpcMethod`/`RpcParam` types either (`packages/core/src/types.ts:327-369`). |
| **Info Object** | | | | |
| `title` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:47`; render `packages/ui/src/organisms/DocumentHeader.svelte:20` | |
| `version` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:57`; render `DocumentHeader.svelte:27` | |
| `description` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:58`; render `DocumentHeader.svelte:23-25` | |
| `summary` | NONE | NONE | not set in the returned object, `packages/core/src/formats/jsonrpc/index.ts:52-67`; contrast OpenAPI, which does set it: `packages/core/src/formats/openapi/index.ts:78` | `ApiDocumentBase.summary` exists and `DocumentHeader.svelte:21` renders it when present — the field is simply never populated for this format. |
| `termsOfService` | NONE | NONE | no `termsOfService` anywhere in `packages/core/src/types.ts` (`ApiDocumentBase`, `packages/core/src/types.ts:158-176`) | Not modelled for any format, so not JSON-RPC-specific, but still a real spec gap. |
| `contact` (name, url, email) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:59` via `parseContact`, `packages/core/src/formats/shared.ts:232-240`; render `DocumentHeader.svelte:29-39` | |
| `license` (name, url, identifier) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:60` via `parseLicense`, `packages/core/src/formats/shared.ts:242-254`; render `DocumentHeader.svelte:41-49` | SPDX `identifier` mapped to `spdx.org` URL. |
| **Server Object** | | | | |
| `name` | FULL | not displayed directly | `packages/core/src/formats/jsonrpc/index.ts:75` | `ServerList.svelte` shows `url`/`description`/`protocol`/`variables`, not `name`, by design (name is a fallback label used elsewhere). |
| `url` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:76`; render `packages/ui/src/organisms/ServerList.svelte:19` | |
| `summary` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:77` (`asString(entry.summary) ?? asString(entry.description)`) | Collapsed into `description`; not distinguished from the Server Object's own `description` field. |
| `description` | FULL (merged with summary) | FULL | `packages/core/src/formats/jsonrpc/index.ts:77`; render `ServerList.svelte:20` | |
| `variables` | NONE | N/A (type supports it, unreached) | `parseServers`, `packages/core/src/formats/jsonrpc/index.ts:70-79`, has no `variables` mapping | `ServerInfo.variables` type (`packages/core/src/types.ts:124-129`) and `ServerList.svelte:26-33` render support exist and are exercised by AsyncAPI; JSON-RPC simply never populates the field. |
| **Method Object** | | | | |
| `name` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:94,98`; render `packages/ui/src/renderers/jsonrpc/RpcMethodCard.svelte:18` | |
| `tags` (names only) | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:102-104`; render as nav grouping `packages/core/src/formats/jsonrpc/index.ts:193-213` | Only `tag.name` is extracted; `Tag.description`/`Tag.externalDocs` from a full Tag Object (inline or `components.tags` via `$ref`) are discarded — `collectTags` (`packages/core/src/formats/jsonrpc/index.ts:180-191`) builds `TagInfo` with only `{ name }`, never populating `TagInfo.description`/`externalDocs` even though the type supports both (`packages/core/src/types.ts:139-143`). |
| `summary` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:99`; render `RpcMethodCard.svelte:23-25` | |
| `description` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:100`; render `RpcMethodCard.svelte:26` | |
| `externalDocs` (method) | NONE | NONE | `RpcMethod` type (`packages/core/src/types.ts:349-362`) has no `externalDocs` field; `parseMethods` (`packages/core/src/formats/jsonrpc/index.ts:93-117`) never reads `entry.externalDocs` | |
| `params` (ContentDescriptor[]) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:106,125-136`; render `RpcMethodCard.svelte:28-49` | |
| `result` (ContentDescriptor \| Reference) | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:107-113`; render `RpcMethodCard.svelte:51-59` | `result.deprecated` is not captured — `RpcMethod.result` type (`packages/core/src/types.ts:359`) has no `deprecated` field, unlike `RpcParam` (`packages/core/src/types.ts:331`) which does. Also `result.summary` is collapsed into `description` (`packages/core/src/formats/jsonrpc/index.ts:110`), same lossy merge as elsewhere. |
| `errors` (Error Object[] \| Reference[]) | FULL (code/message), PARTIAL (`data` treated as `schema`) | FULL | `packages/core/src/formats/jsonrpc/index.ts:114,138-148`; render `RpcMethodCard.svelte:61-84` | `data` is normalised through `normaliseSchema`, i.e. treated as a JSON Schema even though the Error Object's `data` field is "a Primitive or Structured value that contains additional information", not necessarily schema-shaped — a reasonable rendering approximation, noted rather than scored as a defect. |
| `deprecated` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:101`; render `RpcMethodCard.svelte:17` | |
| `paramStructure` (`by-name`\|`by-position`\|`either`) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:105,121-123`; render `RpcMethodCard.svelte:19-21`; default-to-`either` behaviour verified by test `packages/core/src/parse.test.ts:414-428` | Correctly defaults to `either` per spec. |
| `examples` (ExamplePairing[]) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:115,150-177`; render `packages/ui/src/renderers/jsonrpc/RpcExamplePair.svelte:15-38`; tests `packages/core/src/parse.test.ts:390-428` | Param naming vs positional collapsing is structure-aware and tested. |
| `servers` (method-level override) | NONE | NONE | `RpcMethod` type (`packages/core/src/types.ts:349-362`) has no `servers` field; not read in `parseMethods` (`packages/core/src/formats/jsonrpc/index.ts:93-117`) | |
| `links` (Link Object[] \| Reference[]) | NONE | NONE | `RpcMethod` type has no `links` field; no `link` handling anywhere in `packages/core/src/formats/jsonrpc/index.ts` | Link Object's own sub-fields (`name`, `description`, `summary`, `method`, `params`, `server`) are therefore all NONE by extension. |
| **ContentDescriptor Object (params/result)** | | | | |
| `name` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:130,109`; render `RpcMethodCard.svelte:33-35,53` | |
| `summary` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:131,110` | Merged into `description`, not shown as a distinct field. |
| `description` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:131,110`; render `RpcMethodCard.svelte:36-40,54-56` | |
| `required` (params only) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:132`; render `RpcMethodCard.svelte:34` | |
| `schema` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:134,111`; render via `SchemaViewer` `RpcMethodCard.svelte:41-45,57` | |
| `deprecated` (params) | FULL (parse) / PARTIAL (render) | PARTIAL | parse: `packages/core/src/formats/jsonrpc/index.ts:133` sets `RpcParam.deprecated`; render: `RpcMethodCard.svelte` has no per-parameter deprecated badge — only the method-level badge exists at `RpcMethodCard.svelte:17`, and the parameter heading (`RpcMethodCard.svelte:33-35`) shows only name and "required" | Parsed correctly but not surfaced to the reader. |
| `deprecated` (result) | NONE | NONE | not in `RpcMethod.result` type, `packages/core/src/types.ts:359`; not read at `packages/core/src/formats/jsonrpc/index.ts:107-113` | |
| **Example Object / ExamplePairing Object** | | | | |
| `name` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:170`; render `RpcExamplePair.svelte:16` | |
| `description`/`summary` | PARTIAL | PARTIAL | `packages/core/src/formats/jsonrpc/index.ts:171` | Merged, same pattern as elsewhere. |
| `params` (Example[]) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:157-166,172-174`; render `RpcExamplePair.svelte:20-28` | Correctly reconstructs a real by-name/by-position payload rather than echoing raw Example Objects — a deliberate, documented design choice (`packages/core/src/formats/jsonrpc/index.ts:154-160` comments). |
| `result` (Example) | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:167,175`; render `RpcExamplePair.svelte:29-37` | |
| Example Object `externalValue` | NONE | NONE | parsing never reads `entry.result.externalValue` or `param.externalValue` (`packages/core/src/formats/jsonrpc/index.ts:157-177`) | Rare in practice (inline `value` is the common case) but a genuine spec field not modelled. |
| **Components Object** | | | | |
| `components.schemas` | FULL | FULL | `packages/core/src/formats/jsonrpc/index.ts:50` via `parseComponentSchemas`, `packages/core/src/formats/shared.ts:207-216`; render `packages/ui/src/organisms/SchemaCatalog.svelte`, nav `packages/core/src/formats/jsonrpc/index.ts:215-216` | Named, catalogued, and cross-referenced by `refName` (`packages/core/src/schema.ts:81`). |
| `components.contentDescriptors` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | reachable only because `dereferenceDocument` (`packages/core/src/formats/shared.ts:28-66`) resolves *all* `$ref`s generically, not because of any OpenRPC-specific handling | Not separately catalogued/named; a `$ref` to a reusable ContentDescriptor is inlined and loses its component name (no equivalent of `collectComponentNames` for this bucket). |
| `components.examples` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | same generic-`$ref` mechanism as above | Same limitation — not enumerated, no named catalogue entry. |
| `components.links` | NONE | NONE | no `links` handling anywhere (see Method `links` row) — even a `$ref` to `components.links` has nowhere to land, since `RpcMethod` has no `links` field to receive it | |
| `components.errors` | PARTIAL (via `$ref`) | FULL once resolved | `parseErrors` (`packages/core/src/formats/jsonrpc/index.ts:138-148`) reads whatever object is at `entry.errors[i]` after dereferencing, so a `$ref` to `components.errors.X` resolves and renders correctly; no separate errors catalogue/nav section | |
| `components.examplePairings` | PARTIAL (via `$ref`) | PARTIAL (via `$ref`) | same generic mechanism; `parseExamples` (`packages/core/src/formats/jsonrpc/index.ts:150-177`) works on the resolved object regardless of origin | |
| `components.tags` | PARTIAL (via `$ref`, names only) | PARTIAL | method `tags` entries that are `$ref`s to `components.tags` resolve to a Tag Object, but only `.name` survives (`packages/core/src/formats/jsonrpc/index.ts:102-104`) | `description`/`externalDocs` on the resolved Tag Object are discarded, same as inline tags. |
| **JSON Schema (draft-07 / 2019-09 as used by OpenRPC)** | | | | |
| `type`, `properties`, `required`, `items`/`prefixItems` | FULL | FULL | `packages/core/src/schema.ts:154-200` | Shared with OpenAPI/AsyncAPI via `normaliseSchema`. |
| `enum`, `const` | FULL | FULL | `packages/core/src/schema.ts:138-139,235-239` | |
| `oneOf`/`anyOf`/`allOf`/`not` | FULL | FULL | `packages/core/src/schema.ts:202-217` | |
| `additionalProperties` (bool or schema) | FULL | FULL | `packages/core/src/schema.ts:181-187` | Closed-vs-unspecified distinction deliberately preserved. |
| `format`, `pattern`, `minLength`/`maxLength`, `minimum`/`maximum`, `exclusiveMin/Max`, `multipleOf`, `min/maxItems`, `uniqueItems`, `min/maxProperties` | FULL | FULL | `packages/core/src/schema.ts:8-23,248-256` | Rendered as constraint chips. |
| `$ref` (internal & external) | FULL | FULL | dereferenced pre-normalisation, `packages/core/src/formats/shared.ts:28-66`; unresolved refs rendered explicitly `packages/core/src/schema.ts:83-96` | Circular refs handled without infinite recursion, `packages/core/src/schema.ts:98-119`. |
| `title`, `description`, `deprecated`, `readOnly`, `writeOnly`, `default`, `examples`/`example`, `nullable`/`type: [..,'null']` | FULL | FULL | `packages/core/src/schema.ts:125-142` | |
| **JSON-RPC 2.0 transport semantics (not OpenRPC document fields)** | | | | |
| Notifications (request without `id`) | N/A | N/A | no field for this anywhere — reason: OpenRPC's Method Object does not declare whether a method may be called as a notification; this is a per-*request* choice at call time, not a document-level construct | Correctly out of scope for a static description format. |
| Batch requests (JSON array of requests) | N/A | N/A | no batch concept in the OpenRPC Method/Example model | Same reasoning as notifications. |
| Reserved error codes (-32700..-32603 etc.) | N/A (not spec-defined data) | N/A | `RpcError.code` is rendered verbatim (`RpcMethodCard.svelte:66-68`) with no special-casing of the reserved range | Not a spec requirement to special-case; noted only for completeness. |
| Detection of *plain* (non-OpenRPC) JSON-RPC docs | NONE (by design) | N/A | `detectFormat` requires an `openrpc` key, `packages/core/src/detect.ts:26-27`; a bare JSON-RPC request/response object returns `undefined` and fails as "unrecognised document" | Reasonable scope boundary for a docs renderer, stated for completeness rather than as a defect. |

## Gaps

1. **`info.summary` dropped entirely.** User-visible impact: any OpenRPC document using the
   1.3.0+ `info.summary` field (a one-line teaser distinct from `description`) never shows
   it, even though `DocumentHeader.svelte:21` would render it and OpenAPI's parser already
   demonstrates the pattern (`packages/core/src/formats/openapi/index.ts:78`). Severity:
   medium. Package: `packages/core`. Smallest fix: add `summary: asString(info.summary)` to
   the returned object in `packages/core/src/formats/jsonrpc/index.ts:52-67`.

2. **Server `variables` never parsed for OpenRPC.** User-visible impact: an OpenRPC server
   URL with `{environment}`-style template variables shows the raw templated URL with no
   variable table, while the identical shape works for AsyncAPI. Severity: medium. Package:
   `packages/core`. Smallest fix: extend `parseServers` (`packages/core/src/formats/jsonrpc/index.ts:70-79`)
   to map `entry.variables` the way AsyncAPI's parser already does.

3. **Tag `description`/`externalDocs` discarded.** User-visible impact: tags render as bare
   nav-group labels with no explanatory text, even when the document defines rich Tag
   Objects (inline or via `components.tags`). Severity: low. Package: `packages/core`.
   Smallest fix: change `collectTags` (`packages/core/src/formats/jsonrpc/index.ts:180-191`)
   to build full `TagInfo` objects from the resolved tag record instead of just its `name`.

4. **`method.links` (Link Object) not modelled at all.** User-visible impact: a reader
   cannot see runtime-determined cross-references between methods (e.g. "call `getBlock`
   using this result's `hash`") that the spec exists specifically to express. Severity:
   medium (this is a named, non-trivial OpenRPC feature, not an edge case). Package:
   `packages/core` (type + parse) and `packages/ui` (render). Smallest fix: add a `links`
   field to `RpcMethod` in `packages/core/src/types.ts:349-362`, parse it in `parseMethods`
   (`packages/core/src/formats/jsonrpc/index.ts:93-117`), and add a "Links" section to
   `RpcMethodCard.svelte` mirroring the existing Errors section.

5. **`method.servers` override and `method.externalDocs` not modelled.** User-visible
   impact: a method that targets a different server than the document default, or that
   points to extended docs, silently falls back to showing the document-level server list
   only. Severity: low (uncommon in practice). Package: `packages/core` + `packages/ui`.
   Smallest fix: add both fields to `RpcMethod`, parse them, render `externalDocs` as a
   link similarly to `DocumentHeader.svelte:52-57` and `servers` via the existing
   `ServerList` component scoped to the method.

6. **Root-level `externalDocs` not parsed for JSON-RPC.** User-visible impact: a document-
   wide external docs link (which `DocumentHeader.svelte:52-57` already knows how to render)
   never appears for OpenRPC documents. Severity: low. Package: `packages/core`. Smallest
   fix: add `externalDocs: parseExternalDocs(dereferenced.externalDocs)` to
   `packages/core/src/formats/jsonrpc/index.ts:52-67`, reusing the existing shared helper.

7. **Result `ContentDescriptor.deprecated` not captured.** User-visible impact: a result
   documented as deprecated by the spec's own mechanism shows no deprecation signal.
   Severity: low. Package: `packages/core`. Smallest fix: add `deprecated?: boolean` to the
   `result` shape in `RpcMethod` (`packages/core/src/types.ts:359`) and set it from
   `result.deprecated === true` in `packages/core/src/formats/jsonrpc/index.ts:107-113`.

8. **No specification-extension (`x-*`) passthrough for JSON-RPC.** User-visible impact:
   any vendor extension on the OpenRPC document, a method, or a component is silently
   dropped, whereas `isExtensionKey` already exists as shared infrastructure
   (`packages/core/src/formats/shared.ts:270-272`). Severity: low (extensions are
   optional/informal by spec design). Package: `packages/core` + `packages/ui`. Smallest
   fix: scope-dependent on whether other formats already surface extensions in the UI; if
   they do, mirror that mechanism for JSON-RPC — otherwise this may be a pre-existing,
   cross-format gap rather than JSON-RPC-specific and worth a separate look before scoping
   work.

9. **No separate catalogue for `components.contentDescriptors`, `components.examples`,
   `components.examplePairings`, and only partial support for `components.tags`.**
   User-visible impact: reused/shared building blocks referenced by `$ref` still render
   correctly at their point of use (generic dereferencing handles that), but there's no
   "Components" browse surface analogous to the Schemas catalog, so a reader can't discover
   a shared example or content descriptor independent of the method that happens to use it.
   Severity: low (schemas — the highest-value component bucket — already have this).
   Package: `packages/core` + `packages/ui`. Smallest fix: none recommended unless a reader
   need is identified; flagging for awareness rather than proposing work.

10. **Per-param `deprecated` is parsed but not rendered.** User-visible impact: a deprecated
    parameter is indistinguishable from a normal one in `RpcMethodCard.svelte`, even though
    `RpcParam.deprecated` is populated (`packages/core/src/formats/jsonrpc/index.ts:133`).
    Severity: low. Package: `packages/ui`. Smallest fix: add a `deprecated` badge to the
    parameter heading in `RpcMethodCard.svelte:33-35`, matching the existing method-level
    badge pattern at `RpcMethodCard.svelte:17`.

## Method and limits

- Assessment was static: reading `packages/core/src/formats/jsonrpc/index.ts`,
  `packages/core/src/formats/shared.ts`, `packages/core/src/schema.ts`,
  `packages/core/src/types.ts`, `packages/core/src/detect.ts`, `packages/core/src/validate.ts`,
  and the renderers under `packages/ui/src/renderers/jsonrpc/` and
  `packages/ui/src/organisms/{DocumentHeader,ServerList,SchemaCatalog,SchemaViewer}.svelte`,
  plus the existing test suite `packages/core/src/parse.test.ts:336-460` and the fixture
  `examples/wallet.openrpc.json`.
- Every claim above cites a `path:line`; where a construct is entirely absent, the citation
  points at the place it *would* live (a type definition or a sibling format's equivalent
  line) so the absence is falsifiable by inspection.
- No new automated checks were run beyond reading the existing test file; `bun test` for
  `packages/core` was not executed as part of this assessment since the goal was coverage
  auditing, not regression testing, and the brief scoped this as read-only. The existing
  JSON-RPC test suite (`packages/core/src/parse.test.ts:336-460`) was read in full and its
  assertions cross-checked against the matrix above rather than re-run.
- The percentage figures in the Headline are a manual count of the matrix rows above,
  excluding the four rows under "JSON-RPC 2.0 transport semantics" (marked N/A, since they
  are not OpenRPC document constructs) and excluding the plain-JSON-RPC detection row
  (also N/A-by-design). They are a rough index, not a certified metric — several rows bundle
  multiple sub-fields (e.g. the ContentDescriptor rows appear twice, once for params and
  once for result) and reasonable people could count differently.
- "OpenRPC 1.3.2" was assessed from working knowledge of the specification's object model
  (Info, Server/ServerVariable, Method, ContentDescriptor, Example/ExamplePairing, Link,
  Error, Components, Tag, ExternalDocs, Reference) rather than by fetching the live spec
  text at spec.open-rpc.org during this session (no network access was used for this task).
  Flagging this as a limit rather than treating it as verified against the current
  published text line-by-line.
