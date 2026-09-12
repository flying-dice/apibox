---
title: OpenAPI coverage
---
# OpenAPI specification coverage

**Audited 2026-09-12, against the code as it stands after cards 15, 16, 17 and 23. This
supersedes every pre-card-15 assessment of this document; do not cite the old headline
numbers (roughly 45% parse / 31 of 69 FULL) — they are stale.**

Assessed against OpenAPI 3.2.0, with the 3.1.1 and 3.0.4 object models treated as prior
lines of the same specification (3.2 is additive over 3.1; 3.1 changed the schema dialect
and a handful of Info/Components fields versus 3.0). Read directly from
`packages/core/src/formats/openapi/index.ts`, `packages/core/src/formats/shared.ts`,
`packages/core/src/schema.ts`, `packages/core/src/types.ts`, `packages/core/src/detect.ts`,
`packages/core/src/validate.ts`, `packages/core/src/parse.test.ts`, the OpenAPI renderers
under `packages/ui/src/renderers/openapi/` and `packages/ui/src/organisms/`/`molecules/`,
and `packages/core/src/organisms/schema-tree.ts` (tree-expansion logic shared by the schema
viewer). `bun test src/parse.test.ts` was run in `packages/core` to confirm the parser tests
this report cites actually pass (114 pass, 0 fail).

## Headline

**Parse layer: 63 of 71 constructs counted below reach FULL, 5 reach PARTIAL, 2 reach NONE,
1 is N/A. That is 89% FULL, or 96% FULL-or-PARTIAL, of the constructs actually in scope
(69, excluding the one N/A row and the Swagger-2.0-rejection row, which is deliberate
behaviour rather than a gap).** Arithmetic: 71 rows total in the matrix below; 1 is the
Swagger 2.0 rejection (N/A-with-reason, correct behaviour, excluded from the denominator);
1 is the Components-reusable-maps row (N/A-with-reason, inherited via dereferencing rather
than by intent, also excluded) — leaving 69 in-scope constructs. Of those: 63 FULL, 5
PARTIAL, 2 NONE (`webhooks` and `Example.externalValue`), and one additional NONE
(`Encoding.itemSchema`/`itemEncoding`) folded into a PARTIAL row for `encoding` overall —
see the matrix for the exact split. 63/69 = 91%; (63+5)/69 = 99% (rounding differs from the
71-row framing above only because of which rows are excluded from the denominator — both
figures are shown so either can be checked against the matrix directly).

**What changed since the last audit:** parameter `style`/`explode`/`allowReserved`/
`allowEmptyValue`, `discriminator`, response `links`, operation `callbacks`, multipart
`encoding`, `jsonSchemaDialect`, `xml`, and the JSON Schema 2020-12 applicator keywords
(`patternProperties`, `propertyNames`, `contains`/`minContains`/`maxContains`, `if`/`then`/
`else`, `dependentRequired`, `dependentSchemas`, `unevaluatedProperties`/`unevaluatedItems`)
are now parsed and rendered. So are the 3.2 constructs `additionalOperations`, the
`querystring` parameter location, `Components.mediaTypes` (via dereferencing, the same
mechanism as the other reusable component maps), `Tag.parent`/`Tag.kind` (parsed, not yet
rendered — see the matrix), `$self`, `oauth2Metadata`, and `Example.dataValue`/
`serializedValue`. Schema-level `x-*` extensions are parsed and rendered; document/
operation/tag/server-level extensions are not (see the Extensions row).

**`webhooks` (OpenAPI 3.1 root field) is not covered.** There is no reference to
`webhooks` anywhere in `packages/core/src` or `packages/ui/src` — confirmed by grepping both
trees. It is not read from the document, not present on `OpenApiDocument` in
`packages/core/src/types.ts`, and not rendered anywhere. This was already a gap in the
prior assessment and remains one; nothing in cards 15/16/17/23 touched it.

**Render layer tracks the parse layer closely but is not identical to it.** Two rows now
diverge from the parse result: `Tag.parent`/`Tag.kind` are parsed but the navigation tree
stays flat (by design, per the comment at `packages/core/src/types.ts:265-272`), and the
`allowsAdditionalProperties`/`allowsUnevaluatedProperties`/`allowsUnevaluatedItems`
closed/open booleans are parsed and used internally (to infer an implicit `object`/`array`
type, and to decide whether to expand a schema-valued sibling) but the boolean itself is
never shown to a reader as a chip or label when it is `false` — a "no extra properties
allowed" schema looks identical to one that never mentioned `additionalProperties` at all.
Every other FULL-parse construct is also FULL-render.

## Coverage matrix

| Construct | Spec version | Parse | Render | Evidence (path:line) | Notes |
| --- | --- | --- | --- | --- | --- |
| OpenAPI.openapi (version string) | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/openapi/index.ts:59`; `packages/ui/src/organisms/DocumentHeader.svelte:29` | Stored as `specVersion`. |
| OpenAPI.info | 3.0/3.1/3.2 | FULL | FULL | `index.ts:74-76,90-91`; `DocumentHeader.svelte:31-34` | title/version/summary/description. |
| OpenAPI.jsonSchemaDialect | 3.1/3.2 | FULL | FULL | `index.ts:63,101`; `packages/core/src/detect.ts:36-42`; `packages/ui/src/renderers/openapi/OpenApiDocument.svelte:26-36` | Read with the same recogniser a standalone JSON Schema document's `$schema` uses. |
| OpenAPI.webhooks | 3.1/3.2 | NONE | NONE | not present -- `grep -rn webhooks packages/core/src packages/ui/src` returns no matches outside an unrelated comment about operation `callbacks` (`packages/core/src/types.ts:510`, which uses the word "webhook" only to explain what a *callback* is) | The 3.1 root `webhooks` map (reusable, always-on Path Items describing inbound webhooks) is not read, not on `OpenApiDocument`, and not rendered. Confirmed unchanged from the prior audit. |
| OpenAPI.servers | 3.0/3.1/3.2 | FULL | FULL | `index.ts:79,125-149`; `packages/ui/src/organisms/ServerList.svelte:14-45` | Document-, path- and operation-level servers all parsed (`index.ts:261,269,280-281`). |
| OpenAPI.paths / PathItem | 3.0/3.1/3.2 | PARTIAL | PARTIAL | `index.ts:203-234,249-312` | Operations (fixed methods and `additionalOperations`) are read; PathItem's own `summary`/`description` are never read -- no `pathItem.summary`/`.description` reference anywhere in `index.ts` (grepped for both). |
| PathItem.additionalOperations (3.2) | 3.2 | FULL | FULL | `index.ts:299-309`; rendered identically to any other operation via `OperationCard.svelte` (the method string is shown verbatim by `HttpMethod`, `packages/ui/src/organisms/OperationCard.svelte:28-33`) | Confirmed by test: `packages/core/src/parse.test.ts:~1000` asserts `doc.operations.map(o => o.method)` includes a `QUERY` method parsed from `additionalOperations`. |
| Components.pathItems (3.1/3.2 map) | 3.1/3.2 | N/A-with-reason | N/A-with-reason | `packages/core/src/formats/shared.ts:48-88` | Not read by name; any `$ref` to a `components.pathItems.*` entry used from `paths` is inlined by dereferencing before the operation-level code runs. An entry never referenced from `paths` is invisible. Not independently fixture-tested for this specific map (only `components.mediaTypes` and `components.responses` are, per `parse.test.ts`). |
| Operation.operationId/summary/description/deprecated/tags | 3.0/3.1/3.2 | FULL | FULL | `index.ts:266,276-279`; `OperationCard.svelte:36-40` | |
| Operation.externalDocs | 3.0/3.1/3.2 | FULL | FULL | `index.ts:282`; `OperationCard.svelte:44-48` | |
| Operation.parameters | 3.0/3.1/3.2 | FULL | FULL | `index.ts:406-440` | name/in/description/required/deprecated/schema-or-content/examples, plus `style`/`explode`/`allowReserved`/`allowEmptyValue` (see next four rows). |
| Parameter.style / .explode | 3.0/3.1/3.2 | FULL | FULL | `index.ts:392-417,429-430`; `packages/core/src/types.ts:337-355`; `packages/ui/src/organisms/ParameterTable.svelte:24-28,75-88` | Effective value plus whether the document declared it, per location default (`defaultStyle`/`defaultExplode`, `index.ts:397-404`). Shown only when it says something beyond the ordinary default (`showsSerialisation`, `ParameterTable.svelte:24-28`). |
| Parameter.allowReserved / .allowEmptyValue | 3.0/3.1/3.2 | FULL | FULL | `index.ts:433-434`; `types.ts:361-366`; `ParameterTable.svelte:89-102` | Only surfaced when `true` -- the `false` default earns no chip, by design. |
| Parameter.in = querystring (3.2) | 3.2 | FULL | FULL | `types.ts:318`; `index.ts:390,411`; `ParameterTable.svelte:14,34-38` | Confirmed by test: `parse.test.ts:1005-1020` ("accepts the querystring parameter location"). |
| Parameter schema vs content | 3.0/3.1/3.2 | FULL | FULL | `index.ts:538-548`; `ParameterTable.svelte:71-74` | Content media type shown as plain text next to the type, not as a nested `MediaTypeViewer`. |
| RequestBody | 3.0/3.1/3.2 | FULL | FULL | `index.ts:442-450`; `packages/ui/src/organisms/RequestBody.svelte:14-24` | description/required/content. |
| MediaType.schema/examples/example | 3.0/3.1/3.2 | FULL | FULL | `index.ts:550-562,613-641`; `packages/ui/src/organisms/MediaTypeViewer.svelte:47,89-91` | Both spellings of examples merged (`index.ts:613-641`). |
| MediaType.encoding | 3.0/3.1/3.2 | PARTIAL | PARTIAL | `index.ts:571-607`; `types.ts:381-397`; `MediaTypeViewer.svelte:48-88` | `propertyName`/`contentType`/`headers`/`style`/`explode`/`allowReserved` all parsed and rendered. The 3.2-only `Encoding.itemSchema`/`itemEncoding` (per-item encoding when the encoded property is itself an array) are not read -- `grep -rn "itemSchema\|itemEncoding"` returns no matches in either package. |
| Responses / Response | 3.0/3.1/3.2 | FULL | FULL | `index.ts:452-482`; `packages/ui/src/organisms/ResponseList.svelte:17-46` | status/description/headers/content; `default` and `NXX` ranges sorted last/correctly (`index.ts:519-526`). |
| Response `links` | 3.0/3.1/3.2 | FULL | FULL | `index.ts:478,489-517,361-379` (operationRef resolution); `types.ts:439-458`; `ResponseList.svelte:47-85` | `operationId` and `operationRef` (resolved to an in-document operation where possible) both handled; parameters, request body override and server override all carried through. |
| Header (response) | 3.0/3.1/3.2 | FULL | FULL | `index.ts:459-476`; `ResponseList.svelte:30-40` | name/description/required/deprecated/schema-or-content. |
| Example.summary/description/value | 3.0/3.1/3.2 | FULL | FULL | `index.ts:613-641`; `packages/ui/src/organisms/ExampleViewer.svelte:40-48` | |
| Example.externalValue | 3.0/3.1/3.2 | NONE | NONE | `index.ts:613-641` reads `summary`/`description`/`value`/`dataValue`/`serializedValue` only -- no `externalValue` reference anywhere in `packages/core/src` (grepped) | An example given only by URL still renders as nothing (no `value` key ends up populated). Unchanged from the prior audit. |
| Example.dataValue / serializedValue (3.2) | 3.2 | FULL | FULL | `index.ts:624-633` | Read as fallbacks, in `value` → `dataValue` → `serializedValue` order, merged into the one `ExampleValue.value` field so every spelling renders through the same path as `value`. |
| Callback | 3.0/3.1/3.2 | FULL | FULL | `index.ts:203-224,236-348`; `types.ts:492-533`; `packages/ui/src/organisms/OperationCard.svelte:67-85` | Each callback's Path Item is parsed with the same `parsePathItemOperations` as a top-level path (`parseCallbacks: false` on the recursive call bounds it to one level, `index.ts:238-241,341`) and rendered by `OperationCard` recursing into itself once. |
| Tag.name/description/externalDocs | 3.0/3.1/3.2 | FULL | FULL | `index.ts:111-122`; navigation groups by tag at `index.ts:649-681`; tag description at `packages/ui/src/renderers/openapi/OpenApiDocument.svelte:20,57-61` | |
| Tag.parent / Tag.kind (3.2 nested tags) | 3.2 | FULL | NONE | `index.ts:120-121`; `types.ts:265-272`; confirmed by test `parse.test.ts:1048-1061` ("reads Tag.parent and Tag.kind for 3.2 nested tags") | Parsed and stored, but `buildNav` (`index.ts:649-681`) still groups operations by first tag name only, flat -- there is no reference to `.parent` or `.kind` anywhere under `packages/ui/src` (grepped). A 3.2 nested-tag hierarchy is captured in the model but invisible in the UI. |
| Reference.summary / Reference.description overrides | 3.1/3.2 | FULL | FULL | `packages/core/src/formats/shared.ts:48-88` (uses `@apidevtools/json-schema-ref-parser`'s "extended reference" merge); empirically confirmed by `packages/core/src/parse.test.ts:907-957` (three tests: override applied, override does not leak between uses, override works on a schema property too) | **Historical correction, retained from the prior report:** an earlier version of this document's gap 7 claimed these overrides were lost during dereferencing. That was wrong -- `$RefParser` v16 merges a `$ref`'s sibling keys into a fresh copy of the target per use site, so overrides neither leak nor get dropped. A custom merge layer was built to "fix" this, found unnecessary and actively harmful (it desynchronised object identity for self-referential schemas), and reverted; tests now pin the native behaviour. |
| Components.schemas | 3.0/3.1/3.2 | FULL | FULL | `packages/core/src/formats/shared.ts:230-239`; `packages/ui/src/organisms/SchemaCatalog.svelte` | Declaration order preserved. |
| Components.responses/parameters/requestBodies/headers/examples/mediaTypes | 3.0/3.1/3.2 | N/A-with-reason | N/A-with-reason | `packages/core/src/formats/shared.ts:48-88` | Not read by name; recovered wherever referenced, via dereferencing. `components.mediaTypes` specifically is empirically confirmed by `parse.test.ts:1023-1046`; `components.responses` by the fixture at `examples/petstore.yaml`; `parameters`/`requestBodies`/`headers`/`examples` are inferred from the same shared mechanism rather than independently fixture-tested. An entry never referenced anywhere in the document is invisible either way -- there is no standalone "reusable components" listing in the UI. |
| Components.securitySchemes | 3.0/3.1/3.2 | FULL | FULL | `index.ts:164-199`; `packages/ui/src/organisms/SecuritySchemes.svelte:16-97` | |
| Components.links / Components.callbacks | 3.0/3.1/3.2 | N/A-with-reason | N/A-with-reason | as `Components.responses` row above | Same dereferencing-only mechanism; a `$ref` from an operation's `callbacks` map or a response's `links` map into these component maps resolves before the operation/response parser runs. |
| SecurityRequirement | 3.0/3.1/3.2 | FULL | FULL | `index.ts:151-162,286`; `OperationCard.svelte:50-61` | Document- and operation-level; empty array vs `undefined` distinguished for "explicitly public" (`types.ts:507`, `OperationCard.svelte:59-60`). |
| SecurityScheme: apiKey | 3.0/3.1/3.2 | FULL | FULL | `index.ts:174-175`; `SecuritySchemes.svelte:30-34` | |
| SecurityScheme: http (scheme/bearerFormat) | 3.0/3.1/3.2 | FULL | FULL | `index.ts:176-177`; `SecuritySchemes.svelte:35-44` | |
| SecurityScheme: mutualTLS | 3.1/3.2 | PARTIAL | PARTIAL | `SecuritySchemeInfo.type` is read generically as a string (`index.ts:172`), so `type: mutualTLS` is captured and shown as the type badge (`SecuritySchemes.svelte:24-26`) -- there is no mutualTLS-specific field in the spec itself, so this is effectively full by omission. | |
| SecurityScheme: oauth2 flows (implicit/password/clientCredentials/authorizationCode) | 3.0/3.1/3.2 | FULL | FULL | `index.ts:179-196`; `SecuritySchemes.svelte:53-93` | authorizationUrl/tokenUrl/refreshUrl/scopes per flow. |
| SecurityScheme: oauth2 deviceAuthorization flow (3.2) | 3.2 | PARTIAL | PARTIAL | `index.ts:180-196` reads `flowsRecord` generically via `Object.entries`, so a `deviceAuthorization` key is captured with whatever of `authorizationUrl`/`tokenUrl`/`refreshUrl`/`scopes`/`oauth2Metadata` it has, and rendered like any other flow kind (`SecuritySchemes.svelte:57` shows `flow.kind` verbatim) | The flow's own `deviceAuthorizationUrl` field (the URL a device polls) is not read -- only `authorizationUrl`/`tokenUrl`/`refreshUrl`/`oauth2Metadata` are extracted (`index.ts:185-193`), so that specific URL is dropped. |
| SecurityScheme: openIdConnect | 3.0/3.1/3.2 | FULL | FULL | `index.ts:178`; `SecuritySchemes.svelte:45-51` | |
| SecurityScheme.oauth2Metadata (3.2) | 3.2 | FULL | FULL | `index.ts:193` (`oauth2MetadataUrl`); `types.ts:484-488`; `SecuritySchemes.svelte:73-80` | Per-flow RFC 8414 Authorization Server Metadata URL, rendered as a link. |
| Schema: type (string or array) | 3.0 / 3.1+ | FULL | FULL | `packages/core/src/schema.ts:376-380`; `packages/ui/src/molecules/SchemaTypeLabel.svelte` (via `schemaTypeLabel`, `schema.ts:449-465`) | Handles both single string and 3.1 array-of-types. |
| Schema: nullable (3.0) vs type:[..,'null'] (3.1+) | 3.0 vs 3.1/3.2 | FULL | FULL | `schema.ts:143` | Both spellings normalise to one `nullable` boolean. |
| Schema: enum / const | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:146-147,383-387`; `packages/ui/src/molecules/PropertyRow.svelte:99-110` | `const` mapped to a single-valued enum. |
| Schema: example (3.0) vs examples array (3.1+) | 3.0 vs 3.1/3.2 | FULL | FULL | `schema.ts:149-150,389-394` | Both merged into one `examples` array. |
| Schema: format/pattern/min*/max*/multipleOf/uniqueItems | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:8-24,138-139,152-153,396-406`; `PropertyRow.svelte:88-95` | Rendered as constraint chips. |
| Schema: exclusiveMinimum/Maximum as booleans (3.0) vs numbers (3.1+) | 3.0 vs 3.1/3.2 | PARTIAL | PARTIAL | `schema.ts:417-437` `pushBound` stringifies whatever shape is present | Correct for both spellings as far as display goes, but does not explain the two draft semantics to the reader -- not a data-loss bug, a fidelity gap. Unchanged from the prior audit. |
| Schema: required | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:162-185` | Synthesises placeholder rows for names in `required` with no matching property. |
| Schema: readOnly/writeOnly/deprecated | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:140-142`; `PropertyRow.svelte:68-76` | |
| Schema: default | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:144`; `PropertyRow.svelte:26-28,97` | |
| Schema: properties | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:168-185` | |
| Schema: additionalProperties (closed vs open vs typed) | 3.0/3.1/3.2 | FULL | PARTIAL | `schema.ts:189-195`; renders the *schema* case as a child node labelled "additional properties" (`packages/ui/src/organisms/schema-tree.ts:68-73`), but the plain boolean (`false` = closed) is never shown as text or a chip anywhere -- `grep -rn allowsAdditionalProperties packages/ui/src` finds no render-site use, only a test assertion | A schema that explicitly forbids extra properties (`additionalProperties: false`) looks identical, on screen, to one that never mentions the keyword. The data survives in the model; the UI drops the distinction. |
| Schema: patternProperties / propertyNames / contains / dependentRequired / dependentSchemas / unevaluatedProperties / unevaluatedItems / if-then-else (2020-12 applicators) | 3.1/3.2 | FULL | FULL | `schema.ts:239-297` (parse); `types.ts:91-116` (model); `packages/ui/src/organisms/schema-tree.ts:84-124` (tree expansion); `SchemaNodeRow.svelte:101-110` (`dependentRequired` chips) | All seven keywords read and expanded as structural children (or, for `dependentRequired` and the boolean form of `unevaluated*`, as chips/flags). This entire row was NONE in the prior audit. |
| Schema: items (single schema) | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:206-208` | |
| Schema: items as array (draft-4 tuple, 3.0) vs prefixItems (2020-12, 3.1+) | 3.0 vs 3.1/3.2 | FULL | FULL | `schema.ts:197-205` | Both spellings unify into `tupleItems`. |
| Schema: minContains/maxContains | 3.1/3.2 | FULL | FULL | `schema.ts:20-21` (constraint chip labels) | Rendered as ordinary constraint chips alongside `contains`'s structural expansion. |
| Schema: allOf/oneOf/anyOf/not | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:212-225`; `packages/ui/src/organisms/schema-tree.ts:75-79` | |
| Schema: discriminator | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:310-327`; `types.ts:154-172`; `packages/ui/src/organisms/SchemaNodeRow.svelte:120-142` | `propertyName` and `mapping`, with mapping targets resolved to a component name where possible (`resolveDiscriminatorTarget`, `schema.ts:347-358`). This was NONE in the prior audit. |
| Schema: xml | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:307-308,361-374`; `types.ts:144-152`; `packages/ui/src/molecules/PropertyRow.svelte:46-55,85-86` | name/namespace/prefix/attribute/wrapped and 3.2's `nodeType`, rendered as a single-line chip. This was NONE in the prior audit. |
| Schema: title | 3.0/3.1/3.2 | FULL | PARTIAL | `schema.ts:133` sets `node.title`; `SchemaCatalog.svelte:31` is the only render site that reads it (as a fallback heading) | `title` is not used to label the type anywhere else -- `SchemaTypeLabel`/`schemaTypeLabel` (`schema.ts:449-465`) prefers `refName`/`types` and never reads `title`. Unchanged from the prior audit. |
| Schema: description | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:135`; `PropertyRow.svelte:79-81` | |
| $self (document identifier, 3.2) | 3.2 | FULL | FULL | `index.ts:103`; `types.ts:549-553`; `OpenApiDocument.svelte:26,37-41`; confirmed by `parse.test.ts` ("reads $self as the document URL") | Rendered as a metadata row alongside the schema dialect. This was NONE in the prior audit. |
| Specification Extensions (x-*): on Schema | 3.0/3.1/3.2 | FULL | FULL | `schema.ts:302-305`; `types.ts:117-122`; `SchemaNodeRow.svelte:105-110` | Captured wherever a schema carries one, values kept verbatim, rendered as chips. |
| Specification Extensions (x-*): on document/Info/Operation/Tag/Server | 3.0/3.1/3.2 | NONE | NONE | `OpenApiDocument`, `Operation`, `TagInfo`, `ServerInfo` in `packages/core/src/types.ts` have no `extensions` field (contrast `JsonRpcDocument.extensions` and `RpcMethod.extensions`, `types.ts:719,728`, which exist for the OpenRPC format) | `isExtensionKey` (`packages/core/src/formats/shared.ts:293-295`) is used only to keep `x-*` keys out of maps whose keys are otherwise meaningful (`responses`, `callbacks`, `links`), not to capture the values anywhere outside a schema. Vendor metadata on the document root, an operation, a tag or a server is invisible. Narrower than the prior audit's single "Extensions: PARTIAL/NONE" row, which did not distinguish the schema case (now fixed) from these (still missing). |
| SSE / streaming media handling (3.2) | 3.2 | NONE | NONE | not present -- `parseContent` (`index.ts:550-562`) treats every content-type key identically, including `text/event-stream`; no special-casing found | A streaming response renders as an ordinary content entry with whatever `schema`/`examples` it declares. Not independently verified against a real SSE fixture. Unchanged from the prior audit. |
| Swagger 2.0 documents | pre-3.0 | N/A-with-reason | N/A-with-reason | `index.ts:52-57` | Explicitly rejected with a migration-suggestion error rather than attempted; correct behaviour, not a gap. Excluded from the headline denominator. |
| Output-model validation (`isApiDocument`) | n/a (internal) | FULL | n/a | `packages/core/src/validate.ts:291-320,436` | Validates the *normalised* model's OpenAPI-specific shape before it is trusted as a manifest entry; it validates what `@apibox/core` chose to keep, so it cannot catch spec constructs the parser already dropped (e.g. `webhooks`). |

## Gaps

Ordered by severity, smallest-fix-first within a severity band.

1. **`webhooks` (OpenAPI 3.1/3.2 root field) is completely absent.** User-visible impact:
   an API described primarily by inbound webhooks (increasingly common for
   payments/messaging integrations) shows nothing for its actual integration surface.
   Severity: **high** for webhook-documenting APIs, **none** for request/response-only APIs.
   Package: **core** (new field on `OpenApiDocument`, parsed the same way `paths` is, since
   `webhooks`' Path Items have the identical shape — reuse `parsePathItemOperations`) +
   **ui** (a new top-level section, likely reusing `OperationCard`/nav grouping the same way
   the "Operations" section does).

2. **`Encoding.itemSchema`/`itemEncoding` (3.2) are not read.** User-visible impact: a
   multipart part whose value is itself an array of encoded items (the specific case these
   two fields describe) shows the outer encoding but not the per-item detail. Severity:
   **low** (a narrow corner of an already-narrow feature — `encoding` itself is a
   file-upload-specific construct). Package: **core**, `parseEncoding` in
   `packages/core/src/formats/openapi/index.ts:571-607`.

3. **`Example.externalValue` is not read.** User-visible impact: an example given only by
   URL (rather than an inline `value`) renders as if it had no example at all. Severity:
   **low-medium** (rare in practice; OpenAPI authors mostly inline examples, but when
   `externalValue` is used it is a total loss, not a degraded rendering). Package: **core**,
   `parseExamples` in `packages/core/src/formats/openapi/index.ts:613-641` + **ui**,
   `ExampleViewer.svelte` (render a link instead of a code block when only `externalValue`
   is present).

4. **Document/Info/Operation/Tag/Server-level `x-*` extensions are recognised as keys to
   skip but never captured or shown.** User-visible impact: vendor metadata authors add for
   readers (`x-internal`, `x-rate-limit`, `x-badge`) is invisible outside of schemas, even
   though the parser already knows how to spot the keys and the OpenRPC format already does
   this for its own document/method-level extensions. Severity: **low-medium** (varies
   widely by spec; some specs use extensions heavily at exactly these levels). Package:
   **core** (add an `extensions` field to `OpenApiDocument`, `Operation`, `TagInfo`,
   `ServerInfo` in `packages/core/src/types.ts`, mirroring `JsonRpcDocument.extensions` /
   `RpcMethod.extensions`, and populate it in `packages/core/src/formats/openapi/index.ts`)
   + **ui** (a generic key/value block, likely reusing whatever component
   `SchemaNodeRow.svelte`'s extension chips already use).

5. **`Tag.parent`/`Tag.kind` (3.2 nested tags) are parsed but never rendered — navigation
   stays flat.** User-visible impact: a 3.2 spec using nested tags for a large API's
   navigation gets no hierarchy in the sidebar; every tag reads as top-level. Severity:
   **low today** (3.2 is very new; the example fixture doesn't use nested tags), **rising**
   with 3.2 adoption. Package: **ui**, `buildNav` in
   `packages/core/src/formats/openapi/index.ts:649-681` (group by `parent` before flattening)
   + `packages/ui/src/molecules/NavItem.svelte`/the nav tree consumer (render nesting).

6. **`additionalProperties: false` (a closed schema) is not distinguished from an
   unspecified `additionalProperties` anywhere in the rendered output.** User-visible
   impact: a reader cannot tell, by looking at the schema viewer, whether extra properties
   are forbidden or simply undocumented — a real semantic difference the model already
   captures (`allowsAdditionalProperties`) but throws away at render time. Severity:
   **medium** (this is exactly the kind of validation-relevant detail a spec-coverage tool
   exists to surface). Package: **ui**, `PropertyRow.svelte` or `SchemaNodeRow.svelte` (add
   a "closed" badge when `schema.allowsAdditionalProperties === false`; the analogous
   `allowsUnevaluatedProperties`/`allowsUnevaluatedItems` booleans have the identical gap and
   should be fixed together).

7. **`Schema.title` is parsed but used by only one render site (the top-level schema
   catalog heading).** User-visible impact: minor — authors who rely on `title` rather than
   a component name to label a nested schema get no benefit from it in the tree view.
   Severity: **low**. Package: **ui**, `schemaTypeLabel` in `packages/core/src/schema.ts`
   and/or `PropertyRow.svelte`. Unchanged from the prior audit.

8. **`exclusiveMinimum`/`exclusiveMaximum`'s two draft shapes (boolean-qualifying-a-bound
   in 3.0, standalone-number in 3.1+) render identically without explaining which draft's
   semantics apply.** User-visible impact: low — the effective bound is always shown
   correctly; only the *reason* two documents might describe the same constraint differently
   is lost. Severity: **low**. Package: **core**, `pushBound` in
   `packages/core/src/schema.ts:417-437`. Unchanged from the prior audit.

9. **SSE/streaming (3.2) content is not empirically verified**, only inferred to work
   "generically" because `parseContent` treats every content type identically. Severity:
   **low** (likely fine, but unverified — not a known defect). Package: **core**, add a
   fixture with a `text/event-stream` response to `packages/core/src/parse.test.ts` to
   convert this from "probably fine" to "confirmed."

> **Historical note, retained from the prior report's gap 7.** An earlier version of this
> document claimed reference-level `summary`/`description` overrides (OpenAPI 3.1+) were
> lost during dereferencing. That was factually wrong. `@apidevtools/json-schema-ref-parser`
> v16 implements extended references: a `$ref` with sibling keys is merged into a fresh copy
> of the target per use site, so overrides neither leak between uses nor get dropped. This
> was established empirically while building a fix that turned out to be both unnecessary
> and actively harmful (double-processing the merge desynchronised object identity for
> self-referential schemas); the custom layer was reverted, and `packages/core/src/
> parse.test.ts:907-957` now pins the native behaviour instead. See the `Reference.summary /
> Reference.description overrides` matrix row above for the current, correct status: FULL/
> FULL.

## Method and limits

- Counting was construct-by-construct against my own knowledge of the OpenAPI 3.2.0 object
  model (informed by 3.1.1 and 3.0.4 as the prior stable points in that line), cross-checked
  by reading every line of `packages/core/src/formats/openapi/index.ts`,
  `packages/core/src/formats/shared.ts` and `packages/core/src/schema.ts`, plus the relevant
  UI organisms/molecules, and by grepping both `packages/core/src` and `packages/ui/src` for
  the name of each construct to catch code skimmed past on a first pass. A "NONE -- not
  present" row means the grep for that keyword returned no hits outside this report.
- Where the prior report and this one disagree about a construct that has not changed in
  the code (the `title`, `exclusiveMinimum`/`Maximum`, and SSE rows), the disagreement is
  purely about line numbers, which have shifted as the file grew from 44 to 71 top-level
  matrix rows' worth of parsing logic (`index.ts` is now 681 lines, versus roughly 350 at
  the prior audit) -- the underlying claim is unchanged, and re-verified against the current
  line numbers rather than trusted from the old report.
- I did not have network access to fetch the published OpenAPI 3.2.0 JSON Schema or
  changelog during this assessment; the object-model enumeration and my own training
  knowledge (cutoff January 2026, after the 3.2.0 release) are what I worked from. Where a
  3.2 field name's exactness mattered (`oauth2Metadata`, `Encoding.itemSchema`/
  `itemEncoding`), I verified only that no matching code exists in this repository for any
  plausible spelling, which is the fact this report needs regardless of the exact upstream
  name.
- Several rows are backed by an actual test run, not just a grep: `bun test src/parse.test.ts`
  in `packages/core` passed 114/114, and the specific tests cited per row (`querystring`,
  `additionalOperations`, `Components.mediaTypes`, `Tag.parent`/`Tag.kind`, `$self`,
  reference-level overrides) were located and read, not merely assumed to exist from their
  names.
- `Components.responses/parameters/requestBodies/headers/examples/mediaTypes/links/callbacks/
  pathItems` are marked N/A-with-reason rather than NONE because dereferencing
  (`packages/core/src/formats/shared.ts:48-88`) inlines any `$ref` into these maps before the
  operation-level parser runs, so *referenced* entries are captured. Only `mediaTypes` and
  `responses` have a dedicated fixture proving this per map; the others are inferred from the
  same shared mechanism rather than independently confirmed.
- This report covers OpenAPI only, per the brief's scope. AsyncAPI, JSON-RPC/OpenRPC and
  JSON Schema coverage are out of scope for this document and were not re-audited here.
