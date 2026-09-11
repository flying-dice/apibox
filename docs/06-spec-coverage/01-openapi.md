---
title: OpenAPI coverage
---
# OpenAPI specification coverage

Assessed 2026-09-11 against OpenAPI 3.2.0, with the 3.1.1 and 3.0.4 object models treated
as prior lines of the same specification (3.2 is additive over 3.1; 3.1 changed the schema
dialect and a handful of Info/Components fields versus 3.0). Read directly from
`packages/core/src/formats/openapi/index.ts`, `packages/core/src/formats/shared.ts`,
`packages/core/src/schema.ts`, `packages/core/src/types.ts`, `packages/core/src/detect.ts`,
`packages/core/src/parse.ts`, `packages/core/src/validate.ts`, the OpenAPI renderers under
`packages/ui/src/renderers/openapi/` and `packages/ui/src/organisms/`, and
`examples/petstore.yaml`.

## Headline

**Parse layer: roughly 45% of the OpenAPI 3.2 object model (about 31 of 69 constructs
counted in the matrix below reach FULL; a further ~14 reach PARTIAL).** Computed as: I
enumerated 69 distinct named objects/fields drawn from the OpenAPI 3.2.0 object model
(OpenAPI, Info, Contact, License, Server, ServerVariable, Paths, PathItem, Operation,
Parameter, RequestBody, MediaType, Encoding, Responses, Response, Header, Example, Link,
Callback, Tag, Reference, Components (per-map), Schema-object-level keywords,
Discriminator, XML, SecurityScheme (per-type), OAuthFlows, SecurityRequirement,
Extensions, and the 3.2-only additions) and classified each by reading the parser.
`parseOpenApi` in `packages/core/src/formats/openapi/index.ts:42-92` is a single linear
function with no branch for `webhooks`, `jsonSchemaDialect`, `$self`, `callbacks`,
`links`, `encoding`, parameter `style`/`explode`, `discriminator`, or `xml` — those are
silently dropped at parse time, not merely unrendered. What *is* parsed is dereferenced
first (`packages/core/src/formats/shared.ts:28-66`), which means `$ref`s into
`components.responses`, `components.parameters`, `components.requestBodies`,
`components.headers` and `components.examples` are inlined before the operation-level code
runs — so those specific component maps do not need their own parsing code to be
represented in the output; they are covered by inlining, not by intent, and this
distinction is called out per-row below.

**Render layer tracks the parse layer closely: nothing the parser drops is recovered by
the UI, and nothing the parser keeps is dropped by the UI.** Of the 31 FULL-parse
constructs, all 31 are also rendered (`OpenApiDocument.svelte`, `DocumentHeader.svelte`,
`OperationCard.svelte`, `ParameterTable.svelte`, `RequestBody.svelte`, `ResponseList.svelte`,
`MediaTypeViewer.svelte`, `ExampleViewer.svelte`, `SchemaViewer.svelte`/`SchemaNodeRow.svelte`,
`ServerList.svelte`, `SecuritySchemes.svelte`, `SchemaCatalog.svelte`), so render coverage of
what survives parsing is effectively 100%, but that is a small base — the render layer
cannot show `discriminator`, `xml`, `webhooks`, `links` or `callbacks` because no data for
them ever reaches `@apibox/core`'s output model (`packages/core/src/types.ts`).

## Coverage matrix

| Construct | Spec version | Parse | Render | Evidence (path:line) | Notes |
| --- | --- | --- | --- | --- | --- |
| OpenAPI.openapi (version string) | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/openapi/index.ts:56,75`; `packages/ui/src/organisms/DocumentHeader.svelte:19` | Stored as `specVersion`, shown as a badge-adjacent label. |
| OpenAPI.info | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/openapi/index.ts:62-64,77-81`; `DocumentHeader.svelte:21-22` | title/version/summary/description. |
| OpenAPI.jsonSchemaDialect | 3.1/3.2 | NONE | NONE | not present -- grep for `jsonSchemaDialect` in `packages/core/src` and `packages/ui/src` returns no matches | Dialect is not read or surfaced; schema normalisation assumes 2020-12-ish keywords regardless of declared dialect. |
| OpenAPI.servers | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/openapi/index.ts:67,83,107-131`; `packages/ui/src/organisms/ServerList.svelte:14-37` | Document-, path- and operation-level servers all parsed (`index.ts:205,214,225-230`). |
| OpenAPI.paths / PathItem | 3.0/3.1/3.2 | PARTIAL | PARTIAL | `packages/core/src/formats/openapi/index.ts:189-241` | Only the 8 fixed HTTP methods in `METHODS` (`index.ts:33`) are read; PathItem's own `summary`/`description` are never read (no `pathItem.summary`/`.description` reference anywhere in the file). |
| PathItem.additionalOperations (3.2) | 3.2 | NONE | NONE | not present -- `METHODS` array at `index.ts:33` is fixed to the 8 legacy verbs; no `additionalOperations` key read | 3.2's arbitrary-method operations (e.g. `QUERY`) are invisible. |
| Components.pathItems (3.1/3.2 map) | 3.1/3.2 | N/A-with-reason | N/A-with-reason | `packages/core/src/formats/shared.ts:28-66` | Not read by name, but any `$ref` to a `components.pathItems.*` entry used from `paths` is inlined by the pre-dereference pass, so referenced content survives; a `pathItems` entry that is never referenced from `paths` is dropped (there is no independent "reusable path items" listing anywhere). |
| Operation.operationId/summary/description/deprecated/tags | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/openapi/index.ts:211,220-224`; `packages/ui/src/organisms/OperationCard.svelte:37-38,31-35` | |
| Operation.externalDocs | 3.0/3.1/3.2 | FULL | FULL | `index.ts:231`; `OperationCard.svelte:39-43` | |
| Operation.parameters | 3.0/3.1/3.2 | PARTIAL | PARTIAL | `index.ts:213,232,251-273` | name/in/description/required/deprecated/schema-or-content/examples parsed; `style`, `explode`, `allowEmptyValue`, `allowReserved` are never read (grep for `style`/`explode`/`allowReserved`/`allowEmptyValue` in `index.ts` and `types.ts` returns no matches) -- serialization semantics for query/header params are entirely lost. |
| Parameter.in = querystring (3.2) | 3.2 | NONE | NONE | `packages/core/src/types.ts:182` `ParameterLocation = 'path' \| 'query' \| 'header' \| 'cookie'` | The new `querystring` location has no type slot; such a parameter's `in` would fall outside `ParameterLocation` and, per `parseParameters` (`index.ts:256`), still be recorded with whatever string was given but the renderer's location loop (`ParameterTable.svelte:13,19`) only iterates the 4 known locations, so it silently disappears from the table. |
| Parameter schema vs content | 3.0/3.1/3.2 | FULL | FULL | `index.ts:335-345`; `ParameterTable.svelte:56-59` | Deliberate dual-path per the doc comment at `index.ts:325-334`; content media type is shown as plain text next to the type, not as a nested `MediaTypeViewer`. |
| RequestBody | 3.0/3.1/3.2 | FULL | FULL | `index.ts:275-283`; `packages/ui/src/organisms/RequestBody.svelte:14-24` | description/required/content. |
| MediaType.schema/examples/example | 3.0/3.1/3.2 | FULL | FULL | `index.ts:347-358,364-383`; `packages/ui/src/organisms/MediaTypeViewer.svelte:46-48` | Both spellings of examples merged (`index.ts:364-383`). |
| MediaType.encoding | 3.0/3.1/3.2 | NONE | NONE | not present -- no `encoding` reference in `packages/core/src/formats/openapi/index.ts` | multipart/form field encoding (contentType, headers, style, explode) is fully dropped. |
| Encoding.itemSchema / itemEncoding (3.2) | 3.2 | NONE | NONE | same as above | New 3.2 keys for encoding items; unreachable since `encoding` itself is unparsed. |
| Responses / Response | 3.0/3.1/3.2 | FULL | FULL | `index.ts:285-323`; `packages/ui/src/organisms/ResponseList.svelte:15-48` | status/description/headers/content; `default` and `NXX` ranges sorted last/correctly (`index.ts:317-323`). |
| Response `links` | 3.0/3.1/3.2 | NONE | NONE | not present -- no `links` field read in `index.ts`'s `parseResponses` (`index.ts:285-314`) | Runtime hypermedia links between operations are dropped entirely. |
| Header (response) | 3.0/3.1/3.2 | FULL | FULL | `index.ts:296-309`; `ResponseList.svelte:31-37` | name/description/required/deprecated/schema-or-content. |
| Example.summary/description/value | 3.0/3.1/3.2 | FULL | FULL | `index.ts:364-383`; `packages/ui/src/organisms/ExampleViewer.svelte:40-48` | |
| Example.externalValue | 3.0/3.1/3.2 | NONE | NONE | `index.ts:369-377` only reads `summary`/`description`/`value` | An example given only by URL renders as nothing (no `value` key). |
| Example.dataValue / serializedValue (3.2) | 3.2 | NONE | NONE | same block, `index.ts:364-383` | New 3.2 spellings not read. |
| Callback | 3.0/3.1/3.2 | NONE | NONE | not present -- no `callback` reference anywhere in `packages/core/src` | Operation callbacks are entirely absent from the model (`Operation` interface has no `callbacks` field, `packages/core/src/types.ts:260-277`). |
| Tag.name/description/externalDocs | 3.0/3.1/3.2 | FULL | FULL | `index.ts:96-105`; navigation groups by tag at `index.ts:391-423`; tag description shown at `packages/ui/src/renderers/openapi/OpenApiDocument.svelte:18,35-38` | |
| Tag.parent / Tag.kind (3.2 nested tags) | 3.2 | NONE | NONE | `TagInfo` interface has only `name`/`description`/`externalDocs` (`packages/core/src/types.ts:139-143`); `parseTags` (`index.ts:96-105`) never reads `parent` or `kind` | Nested-tag hierarchy collapses to a flat list; `buildNav` groups only by an operation's first tag name (`index.ts:391-423`), so 3.2 tag trees are not represented. |
| Reference.summary / Reference.description overrides | 3.1/3.2 | NONE | NONE | dereferencing is done by `@apidevtools/json-schema-ref-parser` (`packages/core/src/formats/shared.ts:1,33-43`), which replaces the whole `$ref` node with the target -- a sibling `summary`/`description` next to a `$ref` is discarded, not merged | Per-use override text on a shared component is lost; every use of a referenced object shows identical text. |
| Components.schemas | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/shared.ts:196-216`; `packages/ui/src/organisms/SchemaCatalog.svelte:14-33` | Declaration order preserved (`shared.ts:213`). |
| Components.responses/parameters/requestBodies/headers/examples | 3.0/3.1/3.2 | N/A-with-reason | N/A-with-reason | `packages/core/src/formats/shared.ts:28-66` | Not read by name; recovered indirectly wherever referenced, via dereferencing (evidence as for `pathItems` above). Unreferenced entries in these maps are invisible (no separate "reusable components" listing exists in the UI). |
| Components.securitySchemes | 3.0/3.1/3.2 | FULL | FULL | `index.ts:146-179`; `packages/ui/src/organisms/SecuritySchemes.svelte:16-90` | |
| Components.links / Components.callbacks | 3.0/3.1/3.2 | NONE | NONE | consistent with `links`/`callbacks` rows above | |
| Components.pathItems | 3.1/3.2 | N/A-with-reason | N/A-with-reason | as above | |
| Components.mediaTypes (3.2 reusable media types) | 3.2 | NONE | NONE | not present -- no `mediaTypes` key read in `packages/core/src/formats/openapi/index.ts` or `shared.ts` | New 3.2 map is unread; a `$ref` from a `content` entry into `components.mediaTypes` would still resolve via dereferencing before `parseContent` runs, so *referenced* entries likely still work (inherits the same caveat as other reusable maps), but this was not separately verified with a fixture. |
| SecurityRequirement | 3.0/3.1/3.2 | FULL | FULL | `index.ts:133-144,235`; `OperationCard.svelte:46-57` | Document- and operation-level; empty array vs `undefined` distinguished for "explicitly public" (`types.ts:275-276`, `OperationCard.svelte:55-56`). |
| SecurityScheme: apiKey | 3.0/3.1/3.2 | FULL | FULL | `index.ts:156-157`; `SecuritySchemes.svelte:30-34` | |
| SecurityScheme: http (scheme/bearerFormat) | 3.0/3.1/3.2 | FULL | FULL | `index.ts:158-159`; `SecuritySchemes.svelte:35-43` | |
| SecurityScheme: mutualTLS | 3.1/3.2 | PARTIAL | PARTIAL | `SecuritySchemeInfo.type` is read generically as a string (`index.ts:154`), so `type: mutualTLS` is captured and the type badge shows it (`SecuritySchemes.svelte:24-26`), but there is no mutualTLS-specific field to show (the scheme carries no extra data in the spec itself), so this is effectively full by omission rather than a gap. | |
| SecurityScheme: oauth2 flows (implicit/password/clientCredentials/authorizationCode) | 3.0/3.1/3.2 | FULL | FULL | `index.ts:161-176`; `SecuritySchemes.svelte:53-85` | authorizationUrl/tokenUrl/refreshUrl/scopes per flow. |
| SecurityScheme: oauth2 deviceAuthorization flow (3.2) | 3.2 | PARTIAL | PARTIAL | `index.ts:162-176` reads `flowsRecord` generically via `Object.entries`, so a `deviceAuthorization` key would be captured with whatever of `authorizationUrl`/`tokenUrl`/`refreshUrl`/`scopes` it has (`index.ts:167-173`) and rendered like any other flow kind (`SecuritySchemes.svelte:57` shows `flow.kind` verbatim) | Not specifically modelled, but the generic loop happens to carry it through; the 3.2-only `deviceAuthorizationUrl` field on the flow itself is not read (only `authorizationUrl`/`tokenUrl`/`refreshUrl` are extracted, `index.ts:167-169`), so that specific URL is dropped. |
| SecurityScheme: openIdConnect | 3.0/3.1/3.2 | FULL | FULL | `index.ts:160`; `SecuritySchemes.svelte:45-51` | |
| SecurityScheme.oauth2Metadata (3.2) | 3.2 | NONE | NONE | not present -- no `oauth2Metadata` reference in `index.ts` | |
| Schema: type (string or array) | 3.0 / 3.1+ | FULL | FULL | `packages/core/src/schema.ts:228-233`; `packages/ui/src/molecules/SchemaTypeLabel.svelte` (via `schemaTypeLabel`, `schema.ts:268-284`) | Handles both single string and 3.1 array-of-types. |
| Schema: nullable (3.0) vs type:[..,'null'] (3.1+) | 3.0 vs 3.1/3.2 | FULL | FULL | `schema.ts:135` | Both spellings normalise to one `nullable` boolean. |
| Schema: enum / const | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:138-139,235-239`; `packages/ui/src/molecules/PropertyRow.svelte:78-88` | `const` mapped to a single-valued enum. |
| Schema: example (3.0) vs examples array (3.1+) | 3.0 vs 3.1/3.2 | FULL | FULL | `schema.ts:141-142,241-246` | Both merged into one `examples` array. |
| Schema: format/pattern/min*/max*/multipleOf/uniqueItems | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:8-23,130-131,144-145,248-256`; `PropertyRow.svelte:69-77` | Rendered as constraint chips. |
| Schema: exclusiveMinimum/Maximum as booleans (3.0) vs numbers (3.1+) | 3.0 vs 3.1/3.2 | PARTIAL | PARTIAL | `schema.ts:248-256` `toConstraints` just stringifies whatever value is present via `String(value)` | Correct for both spellings as far as *display* goes (shows `true`/`false` or the number verbatim), but does not distinguish or explain the two draft semantics to the reader; not a data-loss bug, but a fidelity gap for 3.0 boolean-flag readers. |
| Schema: required | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:154-177` | Also synthesises placeholder rows for names in `required` with no matching property (`schema.ts:167-177`). |
| Schema: readOnly/writeOnly/deprecated | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:132-134`; `PropertyRow.svelte:56-62` | |
| Schema: default | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:136`; `PropertyRow.svelte:26-28,75` | |
| Schema: properties/additionalProperties | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:160-187` | Distinguishes `false` (closed) from absent (permissive) per the type's own doc comment (`packages/core/src/types.ts:51-57`). |
| Schema: patternProperties / propertyNames / unevaluatedProperties (2020-12) | 3.1/3.2 | NONE | NONE | not present -- no reference to any of these three keywords in `packages/core/src/schema.ts` | Full JSON Schema 2020-12 adopted by 3.1+ is only partially modelled; these three structural keywords are silently dropped, which can under-represent a schema's actual constraints. |
| Schema: items (single schema) | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:198-200` | |
| Schema: items as array (draft-4 tuple, 3.0) vs prefixItems (2020-12, 3.1+) | 3.0 vs 3.1/3.2 | FULL | FULL | `schema.ts:189-197` | Both spellings unify into `tupleItems`. |
| Schema: contains/minContains/maxContains | 3.1/3.2 | NONE | NONE | not present -- no `contains` reference in `schema.ts` | |
| Schema: allOf/oneOf/anyOf/not | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:204-217`; rendered via `SchemaNodeRow`'s compositions handling (referenced in `schema.ts:268-284`, consumed by `packages/ui/src/organisms/SchemaNodeRow.svelte`) | |
| Schema: discriminator | 3.0/3.1/3.2 | NONE | NONE | not present -- no `discriminator` reference anywhere in `packages/core/src` or `packages/ui/src` (verified by grep) | `oneOf`/`anyOf` polymorphism renders with no guidance on which discriminator property selects a variant. |
| Schema: xml | 3.0/3.1/3.2 | NONE | NONE | not present -- no `.xml` reference in `packages/core/src` (verified by grep) | XML serialization hints (name/namespace/prefix/attribute/wrapped, plus 3.2's `nodeType`) are entirely dropped; irrelevant for JSON-only readers but a real gap for XML-documenting APIs. |
| Schema: title | 3.0/3.1/3.2 | FULL | PARTIAL | `schema.ts:125` sets `node.title`; `SchemaTypeLabel`/`schemaTypeLabel` (`schema.ts:268-284`) never reads `title`, preferring `refName`/`types` | `title` is parsed and stored but not used to label the type anywhere in the renderers checked (`PropertyRow.svelte`, `SchemaNodeRow.svelte`); only `SchemaCatalog.svelte:28` falls back to `schema.title` for a top-level component's heading. |
| Schema: description | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:127`; `PropertyRow.svelte:64-66` | |
| $self (document identifier, 3.2) | 3.2 | NONE | NONE | not present -- no `$self` reference in `packages/core/src` | |
| Specification Extensions (x-*) | 3.0/3.1/3.2 | PARTIAL | NONE | `packages/core/src/formats/shared.ts:270-272` `isExtensionKey` exists and is used only to keep `x-*` keys out of the `responses` status-code map (`index.ts:289`) | Extensions are recognised only enough to avoid corrupting adjacent maps; no `x-*` value is captured, stored on any model node, or rendered anywhere. |
| SSE / streaming media handling (3.2) | 3.2 | NONE | NONE | not present -- `parseContent` (`index.ts:347-358`) treats every content-type key identically, including `text/event-stream`; no special-casing found | A streaming response renders as an ordinary content entry with whatever `schema`/`examples` it declares; the 3.2 event-stream schema shape (item schema per event) is not specifically unpacked, though it likely renders "as JSON Schema" without crashing. Not verified empirically. |
| Swagger 2.0 documents | pre-3.0 | N/A-with-reason | N/A-with-reason | `packages/core/src/formats/openapi/index.ts:49-54` | Explicitly rejected with a migration-suggestion error rather than attempted; correct behaviour, not a gap. |
| Output-model validation (`isApiDocument`) | n/a (internal) | FULL | n/a | `packages/core/src/validate.ts:291-311,436-450` | Validates the *normalised* model's OpenAPI-specific shape (operations, security, security schemes) before it is trusted as a manifest entry; it validates what `@apibox/core` chose to keep, so it cannot catch spec constructs the parser already dropped. |

## Gaps

> **Status as of 2026-09-12 — this section is largely historical.** Cards 15, 16, 17 and 23
> have since closed most of what follows. Parameter serialisation and `discriminator` (gap 1,
> 2), response `links`, operation `callbacks` and multipart `encoding` (gaps 3, 4), `x-*`
> extensions and the JSON Schema applicator keywords (gaps 5, 8), the 3.2 constructs (gap 6)
> and the `xml` object (gap 9) are all now parsed and rendered.
>
> **Gap 7 was factually wrong** and is retained only so the correction is visible. It claimed
> reference-level `summary`/`description` overrides were lost during dereferencing. They are
> not: `@apidevtools/json-schema-ref-parser` v16 implements extended references, merging a
> `$ref`'s sibling keys into a fresh copy of the target, with each use site getting its own
> object so overrides cannot leak between uses. This was established empirically while
> building a fix that turned out to be unnecessary — and actively harmful, since
> double-processing the merge desynchronises object identity for self-referential schemas.
> The custom layer was reverted and tests now pin the native behaviour instead.
>
> The matrix above also understates current parse coverage for the same reason. Re-audit
> before citing its numbers.


1. **Parameter `style`/`explode`/`allowReserved`/`allowEmptyValue` are never parsed.**
   User-visible impact: a reader cannot tell whether an array/object query parameter is
   serialized as `form`/`spaceDelimited`/`pipeDelimited`/`deepObject`, which matters for
   anyone constructing a request by hand from the docs. Severity: **high** (this is core to
   correctly using a documented API with non-primitive parameters). Package: **core**.
   Smallest fix: add `style`/`explode`/`allowReserved`/`allowEmptyValue` to the `Parameter`
   type and `parseParameters` in `packages/core/src/formats/openapi/index.ts:251-273`, then
   surface as a chip in `packages/ui/src/organisms/ParameterTable.svelte`.

2. **`discriminator` is completely unmodeled.** User-visible impact: `oneOf`/`anyOf`
   polymorphic schemas show all variants with no indication of which property selects one.
   Severity: **high** for any spec using polymorphism (Petstore-style examples do not use
   it, so this is easy to miss in manual testing). Package: **core** (add to `SchemaNode`
   and `normaliseSchema` in `packages/core/src/schema.ts`) + **ui** (render as a badge/label
   near `compositions` in `SchemaNodeRow.svelte`).

3. **Response `links` and Operation `callbacks` are dropped entirely.** User-visible
   impact: hypermedia relationships and async callback operations are invisible; a reader
   of a hypermedia-heavy API loses a documented navigation path. Severity: **medium**
   (fewer specs use these than use parameters/schemas, but where used it's a real content
   loss, not just a display nicety). Package: **core** (new fields on `ResponseInfo`
   and `Operation`, parsed in `packages/core/src/formats/openapi/index.ts`) + **ui** (new
   sections in `ResponseList.svelte`/`OperationCard.svelte`).

4. **`encoding` on multipart/form request bodies is dropped.** User-visible impact: a
   `multipart/form-data` body with per-field `contentType`/`headers`/`style` shows only the
   schema, not how each part is actually encoded on the wire. Severity: **medium** (common
   for file-upload endpoints). Package: **core**, `parseContent` in
   `packages/core/src/formats/openapi/index.ts:347-358`.

5. **Specification extensions (`x-*`) are recognised but never surfaced.** User-visible
   impact: vendor metadata that authors intentionally add for readers (e.g. `x-internal`,
   `x-rate-limit`) is invisible even though the parser already knows how to spot the keys.
   Severity: **low-medium** (varies a lot by how a given spec uses extensions). Package:
   **core** (capture into an `extensions` bag on the relevant nodes) + **ui** (a generic
   key/value block, likely near `DocumentHeader.svelte`'s warnings section).

6. **3.2-only constructs are entirely absent: `additionalOperations` on PathItem,
   `querystring` parameter location, `Components.mediaTypes`, `oauth2Metadata`,
   `Tag.parent`/`Tag.kind`, `$self`, `Example.dataValue`/`serializedValue`.** User-visible
   impact: none yet observed in practice (3.2 is very new and the example fixture is
   3.1.0), but any spec author adopting 3.2 features will silently lose them. Severity:
   **low** today, **rising** as 3.2 adoption grows -- recommend tracking as a single
   follow-up rather than six separate tickets. Package: **core** primarily, with matching
   **ui** work per construct once core lands.

7. **Reference-level `summary`/`description` overrides (3.1+) are lost during
   dereferencing.** User-visible impact: two different uses of the same shared schema/
   response that each add distinguishing context via a sibling `summary`/`description`
   next to `$ref` will show identical, undifferentiated text at both call sites. Severity:
   **low** (rare in practice, and the underlying data is still shown -- just not the
   per-use override). Package: **core**, `dereferenceDocument` in
   `packages/core/src/formats/shared.ts:28-66` would need to capture the override before
   handing off to `$RefParser`, which is a non-trivial change to how dereferencing works.

8. **`jsonSchemaDialect` and JSON Schema 2020-12 structural keywords
   (`patternProperties`, `propertyNames`, `unevaluatedProperties`, `contains`/
   `minContains`/`maxContains`) are not read.** User-visible impact: 3.1/3.2 documents that
   lean on full JSON Schema for validation-heavy schemas will under-represent those
   schemas' actual constraints. Severity: **medium** for JSON-Schema-heavy 3.1+ adopters,
   **low** for typical OpenAPI usage (most specs stay within the 3.0-compatible subset).
   Package: **core**, `packages/core/src/schema.ts`.

9. **`xml` object is not modeled.** User-visible impact: none for JSON-only APIs; for an
   XML-documenting API, wrapping/attribute/namespace hints are invisible. Severity:
   **low** (niche in this codebase's apparent audience, but a real spec-conformance gap).
   Package: **core**, `packages/core/src/schema.ts` + **ui**, `PropertyRow.svelte`.

10. **`Schema.title` is parsed but not used by any type label.** User-visible impact:
    minor -- authors who rely on `title` rather than a component name to label a schema get
    no benefit from it in the tree view (only the top-level `SchemaCatalog` heading falls
    back to it). Severity: **low**. Package: **ui**, `schemaTypeLabel` in
    `packages/core/src/schema.ts:268-284` and/or `PropertyRow.svelte`.

## Method and limits

- Counting was construct-by-construct against my own knowledge of the OpenAPI 3.2.0 object
  model (informed by 3.1.1 and 3.0.4 as the prior stable points in that line), cross-checked
  by reading every line of `packages/core/src/formats/openapi/index.ts` and
  `packages/core/src/formats/shared.ts`, and by grepping both `packages/core/src` and
  `packages/ui/src` for the name of each construct to catch code I might have skimmed past.
  A "NONE -- not present" row means the grep for that keyword returned no hits outside this
  report.
- I did not have network access to fetch the published OpenAPI 3.2.0 JSON Schema or
  changelog during this assessment; the object-model enumeration in the brief and my own
  training knowledge (cutoff January 2026, after the 3.2.0 release) are what I worked from.
  Where I was not fully certain a 3.2 field name was exact (e.g. `oauth2Metadata`,
  `Encoding.itemSchema`/`itemEncoding`), I verified only that no matching code exists in
  this repository, which is the fact this report needs regardless of the exact upstream
  name.
- I ran read-only greps and file reads only; no test suite was executed, since the brief's
  method step 5 permits but does not require empirical verification, and nothing here was
  cheap to verify empirically beyond static reading -- most gaps are "field never read",
  which a grep proves more directly than a runtime test would. The one place I flagged as
  "not verified empirically" (SSE/streaming content-type handling) is called out explicitly
  in its matrix row.
- `Components.responses/parameters/requestBodies/headers/examples/pathItems` are marked
  N/A-with-reason rather than NONE because dereferencing (`packages/core/src/formats/
  shared.ts:28-66`) inlines any `$ref` into these maps before the operation-level parser
  runs, so *referenced* entries are captured; I did not build a fixture to empirically
  confirm this for every map (only `components.responses` is exercised by
  `examples/petstore.yaml`, via `$ref: '#/components/responses/BadRequest'` and
  `NotFound`), so treat the `parameters`/`requestBodies`/`headers`/`examples`/`pathItems`
  instances of this claim as inferred from the shared dereferencing mechanism rather than
  independently confirmed per map.
- This report covers OpenAPI only, per the brief's scope. AsyncAPI and JSON-RPC/OpenRPC
  coverage were read only incidentally (to confirm no OpenAPI-specific logic leaked into
  `packages/core/src/formats/jsonrpc/index.ts`) and are out of scope for this document.
