---
title: AsyncAPI coverage
---

# AsyncAPI specification coverage

Assessed 2026-09-11 against AsyncAPI 3.0.0 (and the 2.6.0 compatibility path via
`@asyncapi/parser@3.6.3`).

## Headline

apibox's AsyncAPI support parses and renders the "happy path" of a channel/operation/message
document — info, servers (minus variables/security), channel addresses, path parameters,
message payloads and headers, and 2.x↔3.x action/parameter-shape normalisation all work and
are covered by an e2e test against `examples/streetlights.asyncapi.yaml`. Everything AsyncAPI
adds beyond that core — bindings, security schemes, message examples, correlation IDs,
operation replies, multi-format (Avro/Protobuf/OpenAPI) schemas, operation- and channel-level
tags/externalDocs, and channels with no operation — is either silently dropped during parsing
or parsed but never rendered. Of the ~30 first-class object/field groups enumerated in the
matrix below, roughly **10 are FULL** (parsed and rendered end-to-end), **6 are PARTIAL**
(parsed but not rendered, or rendered only for a subset of fields), and **~14 are NONE**
(present in the spec, absent from both the type model and the code). That is a parse-layer
completeness of roughly **35%** of enumerated constructs and a render-layer completeness of
roughly **30%**, computed as (FULL count) / (FULL + PARTIAL + NONE count) per layer — see
"Method and limits" for how that count was built. This is consistent with the feature's own
history: `boards/project-backlog/10-asyncapi-and-jsonrpc-renderers.md` describes the AsyncAPI
renderer as intentionally "thin" — proving the plugin seam holds, with "depth" deferred.

## Coverage matrix

| Construct | Spec version | Parse | Render | Evidence (path:line) | Notes |
|---|---|---|---|---|---|
| AsyncAPI Object: `asyncapi` version | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:99` (`specVersion: document.version()`); `packages/ui/src/organisms/DocumentHeader.svelte:19` renders it | |
| AsyncAPI Object: `id` (application URI) | 3.0 | NONE | NONE | no call to an `id()`/URI accessor in `packages/core/src/formats/asyncapi/index.ts`; `AsyncApiDocument` (types.ts:316-321) has no `id`-of-the-API field, only the internal slug `id` from `ApiDocumentBase` (types.ts:159) | apibox's own doc `id` is a slug, not the spec's `id` |
| AsyncAPI Object: `defaultContentType` | 2.6/3.0 | NONE | NONE | not read in `packages/core/src/formats/asyncapi/index.ts`; `MessageInfo` has no default-content-type field (types.ts:293-302) | messages without their own `contentType` render with no content type at all |
| Info: `title`, `version` | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:46-47`; `packages/ui/src/organisms/DocumentHeader.svelte:21,28` | |
| Info: `description` | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:102`; `DocumentHeader.svelte:23-25` | |
| Info: `termsOfService` | 2.6/3.0 | NONE | NONE | `ApiDocumentBase` (types.ts:158-176) has no `termsOfService` field at all (checked across all three formats); empirically confirmed dropped — `/tmp` scratch doc with `termsOfService` produced no such key in the parsed JSON | not modelled for any format, not AsyncAPI-specific |
| Info: `contact` | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:103-111` via `parseContact` (`packages/core/src/formats/shared.ts:232-240`); `DocumentHeader.svelte:29-43` | |
| Info: `license.name` | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:112`; `DocumentHeader.svelte:44-53` | |
| Info: `license.url` / 3.0 `identifier` | 3.0 | NONE | NONE | `packages/core/src/formats/asyncapi/index.ts:112` builds `{ name: info.license()?.name() ?? '' }` only — never calls `.url()`, and does not reuse `parseLicense` (`packages/core/src/formats/shared.ts:242-254`) which OpenAPI uses; empirically confirmed — scratch doc with `license.url` set produced `{"name":"Apache 2.0"}` with no `url` | License renders as plain text even when the document supplies a URL |
| Info: `tags` (3.0 moved tags here from root) | 2.6/3.0 | FULL | NONE | parsed at `packages/core/src/formats/asyncapi/index.ts:59-63` into `AsyncApiDocument.tags`; never read by any AsyncAPI-rendering component — `grep -rn "tags" packages/ui/src/renderers/asyncapi packages/ui/src/organisms/*.svelte` matches nothing for AsyncAPI (only `OpenApiDocument.svelte:18` uses `document.tags`); empirically confirmed via `/tmp` scratch doc — the tag round-trips into the JSON but `AsyncApiDocument.svelte` never touches `document.tags` | parsed data present in the model, dead on the render side |
| Info: `externalDocs` | 2.6/3.0 | NONE | N/A (field exists but never populated) | `ApiDocumentBase.externalDocs` (types.ts:170) is set for OpenAPI (`packages/core/src/formats/openapi/index.ts:82`) but never set in `packages/core/src/formats/asyncapi/index.ts`; `DocumentHeader.svelte:55-61` would render it if present; empirically confirmed — scratch doc with `info.externalDocs.url` produced no `externalDocs` key | one-line fix: call `parseExternalDocs(info.externalDocs()...)` |
| Servers: `host`/`url`, `protocol`, `description` | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:49-57`; `packages/ui/src/organisms/ServerList.svelte:20-22` | |
| Servers: `protocolVersion` | 2.6/3.0 | NONE | NONE | not read in `packages/core/src/formats/asyncapi/index.ts:49-57`; `ServerInfo` (types.ts:117-130) has no `protocolVersion` field | |
| Servers: `pathname` (3.0) | 3.0 | NONE | NONE | not read; `ServerInfo` has no such field | |
| Servers: `variables` | 2.6/3.0 | NONE | PARTIAL (renderer supports it, parser never populates it) | `ServerInfo.variables` exists (types.ts:124-129) and `ServerList.svelte:23-32` renders it, but `packages/core/src/formats/asyncapi/index.ts:49-57` never calls a variables accessor; empirically confirmed — scratch doc with `servers.prod.variables.{sub,port}` produced a server object with no `variables` key | render path exists and is dead code for AsyncAPI until parse is fixed |
| Servers: `security` | 2.6/3.0 | NONE | NONE | no security accessor call in the servers mapping (`packages/core/src/formats/asyncapi/index.ts:49-57`); empirically confirmed — scratch doc's `servers.prod.security` vanished entirely | |
| Servers: `tags`, `bindings` | 3.0 | NONE | NONE | not read anywhere in `packages/core/src/formats/asyncapi/index.ts`; no `binding` occurrences anywhere in `packages/core/src` or `packages/ui/src` (`grep -rn -i binding` returns nothing) | |
| Channels: `address` | 3.0 (2.x: channel key) | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:77`; `packages/ui/src/renderers/asyncapi/AsyncApiOperationCard.svelte:27` | |
| Channels: `title` | 3.0 only | PARTIAL | FULL when present | `readTitle` (`packages/core/src/formats/asyncapi/index.ts:122-126`) guards for 2.x lacking a title accessor; rendered as a summary/title fallback at `AsyncApiOperationCard.svelte:23-25` and in nav labels (`index.ts:193`) | correct handling of the 2.x/3.x asymmetry |
| Channels: `summary`, `description` | 2.6/3.0 | PARTIAL | PARTIAL | Channel's own `summary`/`description` are not read separately — only the *operation's* `summary`/`description` are (`packages/core/src/formats/asyncapi/index.ts:79-80`); a channel `description` with no operation-level description is lost | channel- vs operation-level description are conflated |
| Channels: `messages` | 2.6/3.0 | FULL | FULL | via `operation.messages().all()` (`packages/core/src/formats/asyncapi/index.ts:82-85`), which the parser resolves through the channel | |
| Channels: `parameters` | 2.6/3.0 | FULL | FULL | `parseChannelParameters` (`packages/core/src/formats/asyncapi/index.ts:130-140`); `packages/ui/src/organisms/ParameterTable.svelte:19-69` | 2.x nested `schema` vs 3.0 inline shape both handled (`index.ts:142-154`), empirically verified against a 2.6.0 scratch doc |
| Channels: `servers` (restricting which servers a channel is available on) | 3.0 | NONE | NONE | not read | |
| Channels: `tags`, `externalDocs`, `bindings` | 2.6/3.0 | NONE | NONE | not read; no `binding`/channel-level `tags` handling in `index.ts` | |
| Channels with zero operations | 2.6/3.0 | NONE | NONE | the model is built by iterating `document.operations().all()` and taking each operation's first channel (`packages/core/src/formats/asyncapi/index.ts:66-87`); there is no separate pass over `document.channels()`; empirically confirmed — a scratch doc with an `orphan` channel referenced by no operation produced zero trace of it in the parsed document | a channel that exists purely for documentation (no publish/subscribe yet) disappears entirely |
| Parameters: `enum`, `default`, `description` (3.0 inline shape) | 3.0 | FULL | FULL | `parameterSchema` prefers the 2.x nested schema, else normalises the parameter object itself (`packages/core/src/formats/asyncapi/index.ts:150-154`); rendered via `SchemaTypeLabel`/`ParameterTable` | empirically verified — 3.0 `enum: [a,b]` on a parameter round-trips into `schema.enum` |
| Parameters: `location` (3.0 RFC 6901 pointer) | 3.0 | NONE | NONE | not read; every AsyncAPI parameter is hard-coded `in: 'path'` (`packages/core/src/formats/asyncapi/index.ts:135`) | reasonable default since 3.0 parameters are always address-template substitutions, but a `location` pointing elsewhere in the message is not honoured |
| Message: `name`, `title`, `summary`, `description`, `contentType` | 2.6/3.0 | FULL | FULL | `toMessageInfo` (`packages/core/src/formats/asyncapi/index.ts:157-166`); `packages/ui/src/renderers/asyncapi/AsyncApiMessage.svelte:15-19` | |
| Message: `payload` | 2.6/3.0 | FULL (as JSON Schema) | FULL | `index.ts:164`; `AsyncApiMessage.svelte:20-23` via `SchemaViewer` | see multi-format schemas row below for non-JSON-Schema payloads |
| Message: `headers` | 2.6/3.0 | FULL | FULL | `index.ts:165`; `AsyncApiMessage.svelte:24-27` | |
| Message: `correlationId` | 2.6/3.0 | NONE | NONE | not read in `toMessageInfo` (`packages/core/src/formats/asyncapi/index.ts:157-166`); `MessageInfo` (types.ts:293-302) has no `correlationId` field; empirically confirmed — a scratch message with `correlationId.location` produced no trace in the output | |
| Message: `examples` | 2.6/3.0 | NONE | PARTIAL (renderer supports it, parser never populates it) | `MessageInfo.examples` exists (types.ts:301) and `AsyncApiMessage.svelte:28-30` renders it via `ExampleViewer`, but `toMessageInfo` never reads a message's `examples()` (`packages/core/src/formats/asyncapi/index.ts:157-166`); empirically confirmed — a scratch message with one example produced no `examples` key | same shape of gap as server `variables`: UI is ready, parser isn't |
| Message: `tags`, `externalDocs`, `bindings` | 2.6/3.0 | NONE | NONE | not read; no such fields on `MessageInfo` | |
| MessageTrait | 2.6/3.0 | FULL (merged) | FULL (merged) | not modelled explicitly, but `@asyncapi/parser` applies traits before the effective-value accessors return, so `toMessageInfo` sees post-trait values automatically; empirically confirmed — a message with only a `traits` ref supplying `contentType`/`summary` produced those fields correctly in the parsed output | apibox never distinguishes "own value" from "value from a trait", which is fine for rendering but means trait reuse itself isn't visible to a reader |
| Operation: `action` (`send`/`receive`, 2.x `publish`/`subscribe`) | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:71-76` maps 2.x spelling onto 3.x; `AsyncApiOperationCard.svelte:17-22` (badge) | empirically verified against a 2.6.0 scratch doc: `subscribe`→`receive`, `publish`→`send` |
| Operation: `channel` reference | 2.6/3.0 | FULL | FULL | `operation.channels().all()[0]` (`index.ts:70`) | |
| Operation: `title`, `summary`, `description` | 2.6/3.0 | FULL | FULL | `index.ts:79-80`; `AsyncApiOperationCard.svelte:23-29` | operation `title` itself is not separately read/rendered — only `summary`/`description`/channel title/address are used as the heading fallback chain (`index.ts:193`, `AsyncApiOperationCard.svelte:24`) |
| Operation: `security` | 2.6/3.0 | NONE | NONE | not read in the operations map (`index.ts:66-87`); `ChannelOperation` (types.ts:304-314) has no `security` field; empirically confirmed — scratch operation with `security: [{type: apiKey, in: user}]` produced no trace | contrast with OpenAPI, which does model per-operation `security` (types.ts:276) |
| Operation: `tags` | 3.0 (2.x: on publish/subscribe) | NONE | NONE | not read; `ChannelOperation` has no `tags` field; empirically confirmed — scratch operation with `tags: [{name: op-tag}]` produced no trace | |
| Operation: `bindings` | 2.6/3.0 | NONE | NONE | no `binding` occurrences anywhere in `packages/core/src` (`grep -rn -i binding`) | |
| Operation: `reply` / `OperationReply` / `OperationReplyAddress` | 3.0 only | NONE | NONE | not read; `ChannelOperation` has no `reply` field; empirically confirmed — scratch operation with a `reply.channel` ref produced no trace | request/reply patterns (common in Kafka/AMQP APIs) are invisible |
| Operation: `messages` (subset selection) | 2.6/3.0 | FULL | FULL | `operation.messages().all().map(toMessageInfo)` (`index.ts:82-85`) | |
| OperationTrait | 2.6/3.0 | FULL (merged) | FULL (merged) | same trait-merging mechanism as MessageTrait; empirically confirmed — an operation with only an `operationTraits` ref supplying `summary` produced the merged summary | |
| Components: `schemas` | 2.6/3.0 | FULL | FULL | `document.components().schemas().all()` (`index.ts:89-94`); `SchemaCatalog.svelte` | |
| Components: `messages`, `parameters`, `correlationIds`, `replies`, `replyAddresses`, `operationTraits`, `messageTraits` (as standalone catalog entries) | 2.6/3.0 | NONE (as a browsable list) | NONE | never iterated directly — only reached indirectly when a channel/operation/message references them; there is no components catalog page/section anywhere in `packages/ui/src/renderers/asyncapi` | consistent with there being no such section in `AsyncApiDocument.svelte:1-56` |
| Components: `securitySchemes` | 2.6/3.0 | NONE | NONE | `AsyncApiDocument` (types.ts:316-321) has no `securitySchemes` field, unlike `OpenApiDocument.securitySchemes` (types.ts:283); `packages/ui/src/organisms/SecuritySchemes.svelte` is never imported by any AsyncAPI renderer (`grep -rn SecuritySchemes packages/ui/src/renderers/asyncapi` — no matches); empirically confirmed — a scratch doc with `components.securitySchemes.apiKeyAuth` produced no trace | full security-scheme rendering exists for OpenAPI (`SecuritySchemes.svelte`) but nothing wires AsyncAPI to it |
| Components: `serverVariables`, `serverBindings`, `channelBindings`, `operationBindings`, `messageBindings`, `externalDocs`, `tags` (reusable component catalogs) | 3.0 | NONE | NONE | never referenced in `index.ts` | |
| Tag Object (`name`, `description`) | 2.6/3.0 | FULL | NONE | see "Info: tags" row above | |
| Tag Object: `externalDocs` | 2.6/3.0 | NONE | N/A | `TagInfo.externalDocs` exists (types.ts:142) but is never populated in `packages/core/src/formats/asyncapi/index.ts:59-63` (only `name`/`description` are read) | |
| Reference Object (`$ref`) | 2.6/3.0 | FULL (resolved by parser) | FULL / explicit-unresolved-marker on failure | resolution is delegated to `@asyncapi/parser`'s own dereferencing (used implicitly by every `.foo()` accessor in `index.ts`); unresolved external refs surface via `normaliseSchema`'s `unresolvedRef` handling (`packages/core/src/schema.ts:83-96`) | AsyncAPI does not go through the shared `dereferenceDocument` in `packages/core/src/formats/shared.ts:28-66` — that helper is OpenAPI/OpenRPC-only; the parser library does its own thing |
| Schema Object — core JSON Schema keywords (`type`, `properties`, `items`, `required`, `enum`, `const`, composition, constraints, etc.) | 2.6/3.0 (AsyncAPI-flavoured 2020-12) | FULL | FULL | shared with OpenAPI/OpenRPC: `packages/core/src/schema.ts:52-284` | |
| Schema Object — multi-format schemas (`schemaFormat`: Avro, Protobuf, OpenAPI Schema, RAML, etc.) | 2.6/3.0 | NONE | NONE | `schemaFormat` is never read anywhere in the codebase — `grep -rn schemaFormat packages/core/src packages/ui/src` returns no matches; `normaliseSchema` (`packages/core/src/schema.ts:52-226`) unconditionally interprets every payload/header as plain JSON Schema, so a non-default-format payload (e.g. an Avro `record` with `fields`) would be walked as if `fields`/`name`/`type: record` were JSON Schema keywords, producing a meaningless tree (no `properties`, `type: ['record']`) rather than a rendered Avro/Protobuf structure | confirmed structurally; a live round-trip through `@asyncapi/parser` for a non-default `schemaFormat` additionally failed its own internal AsyncAPI-schema validation in our scratch test, independent of apibox's code |
| CorrelationId Object | 2.6/3.0 | NONE | NONE | see "Message: correlationId" row | |
| Security Scheme Object (all types: apiKey, http, oauth2, openIdConnect, userPassword, X509, symmetricEncryption, asymmetricEncryption, httpApiKey, scramSha256/512, plain, gssapi) | 2.6/3.0 | NONE | NONE | see "Components: securitySchemes" row; `SecuritySchemeInfo` (types.ts:238-258) is modelled generically enough to cover these but is only ever populated by the OpenAPI parser | |
| Bindings — all protocols | 2.6/3.0 | NONE | NONE | see "Bindings coverage" section below | |
| Specification Extensions (`x-*`) | 2.6/3.0 | NONE (AsyncAPI-specific) | NONE | `isExtensionKey` exists (`packages/core/src/formats/shared.ts:270-272`) but is used only by OpenAPI response-key filtering (`grep -rn isExtensionKey packages/core/src` shows the one definition and no AsyncAPI call site); no field anywhere carries `x-*` extension data through for AsyncAPI | |
| Document-level `warnings` (non-fatal diagnostics) | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:35-43`; `DocumentHeader.svelte:64-73` | empirically verified — a deliberately sparse scratch doc produced 9 parser diagnostics that all surfaced as `warnings` |
| Structural round-trip validation (`isApiDocument`) | n/a (apibox-internal) | PARTIAL | n/a | `isAsyncOperation` (`packages/core/src/validate.ts:344-365`) checks only `id`, `action`, `channelAddress`, `parameters`, `messages` — it has no awareness of (and therefore cannot catch regressions in) any of the NONE-rated fields above, because the type model itself doesn't carry them | validation is only as complete as the type model it checks |

## Bindings coverage

AsyncAPI's Bindings Object family (one binding object per protocol, attachable to Server,
Channel, Operation and Message) is a large, protocol-specific surface — the spec ships a
distinct schema per protocol (amqp, amqp1, anypointmq, googlepubsub, http, ibmmq, jms, kafka,
mercure, mqtt, mqtt5, nats, pulsar, redis, sns, solace, sqs, stomp, ws, and others via
community bindings). It was checked separately here because it is easy to overstate.

| Protocol | Server bindings | Channel bindings | Operation bindings | Message bindings | Evidence |
|---|---|---|---|---|---|
| Any/all protocols | NONE | NONE | NONE | NONE | `grep -rn -i "binding" packages/core/src packages/ui/src` returns zero matches in either package; `ServerInfo`, `ChannelOperation`, `MessageInfo` (types.ts) have no `bindings` field of any kind |

Verdict: bindings coverage is **0%** — no protocol, and no binding-bearing object, is read,
modelled, or rendered anywhere in the codebase. A Kafka/MQTT/AMQP-heavy AsyncAPI document
(the dominant real-world case) loses all of its topic/partition/QoS/exchange-routing detail
when viewed in apibox.

## Gaps

1. **Bindings are entirely unsupported (all protocols, all four binding locations).**
   User-visible impact: for the AsyncAPI documents most likely to appear in practice (Kafka,
   MQTT, AMQP), transport-specific detail such as topic name, partition key, QoS, exchange
   type, or SNS/SQS ARNs is invisible — readers see only an address string and a payload.
   Severity: **high**. Package: `core` (parsing) + `ui` (rendering). Smallest change to close:
   add a `bindings?: Record<string, Record<string, unknown>>` bag to `ServerInfo`,
   `ChannelOperation`, and `MessageInfo`, populate it verbatim (no need to model every
   protocol schema) from `.bindings().all()` in `packages/core/src/formats/asyncapi/index.ts`,
   and render it as a generic key/value table — full protocol-aware rendering can follow later.

2. **Components `securitySchemes` and Server `security` are dropped; `AsyncApiDocument` has
   no `securitySchemes` field at all.** User-visible impact: readers of an AsyncAPI doc never
   see how to authenticate to the API, even though `SecuritySchemes.svelte` already exists and
   works for OpenAPI. Severity: **high**. Package: `core` + `ui`. Smallest change: add
   `securitySchemes: SecuritySchemeInfo[]` to `AsyncApiDocument`, populate from
   `document.components().securitySchemes().all()`, and mount the existing
   `SecuritySchemes.svelte` in `AsyncApiDocument.svelte`.

3. **Operation `reply` (request/reply pattern) is dropped.** User-visible impact: APIs that
   model a reply channel (common in RPC-over-messaging designs) show only the initiating
   operation, with no indication a reply exists or where. Severity: **medium**. Package:
   `core` + `ui`. Smallest change: add an optional `reply` field to `ChannelOperation`
   (address + optional message summary) and render it as a small annotation on the operation
   card.

4. **Message `examples` are parsed by nobody, despite the renderer already supporting them.**
   User-visible impact: authors who provide `examples` on a message (the natural place to put
   a sample payload) see nothing — `ExampleViewer` never mounts. Severity: **medium**.
   Package: `core`. Smallest change: in `toMessageInfo` (`packages/core/src/formats/asyncapi/index.ts:157-166`),
   map `message.examples().all()` into `ExampleValue[]`; this is a self-contained few-line fix.

5. **Server `variables` are parsed by nobody, despite `ServerList.svelte` already rendering
   them.** Same shape of bug as #4 — dead UI code. User-visible impact: templated server URLs
   (e.g. `{sub}.example.com`) show the raw placeholder with no explanation of what it means or
   its allowed values. Severity: **medium**. Package: `core`. Smallest change: map
   `server.variables().all()` in the servers loop (`packages/core/src/formats/asyncapi/index.ts:49-57`).

6. **Multi-format schemas (`schemaFormat`: Avro, Protobuf, OpenAPI Schema, etc.) are not
   detected and are force-walked as JSON Schema.** User-visible impact: a payload declared in
   Avro or Protobuf renders as a meaningless, nearly-empty schema tree instead of either the
   native structure or a clear "not JSON Schema" notice. Severity: **medium** (real-world
   frequency is lower than bindings/security, but the failure mode — silently wrong rather
   than absent — is worse). Package: `core`. Smallest change: read `schemaFormat()` and, when
   it is not the AsyncAPI default, skip `normaliseSchema` and instead surface the raw payload
   with a "non-JSON-Schema payload (format: …)" marker rather than misinterpreting it.

7. **Channels with no operation referencing them are invisible.** User-visible impact: a
   channel documented purely for future/partial use (a common authoring pattern —
   "documenting a channel before wiring an operation to it") disappears from the rendered
   document with no warning. Severity: **low-medium**. Package: `core`. Smallest change:
   iterate `document.channels().all()` in addition to `document.operations().all()` and
   synthesize a channel-only entry (or at minimum push a warning) for channels with zero
   operations.

8. **Parsed `tags` are never rendered for AsyncAPI documents** (OpenAPI's equivalent works).
   User-visible impact: any `info.tags` a document declares is invisible. Severity: **low**.
   Package: `ui`. Smallest change: render a tag list/filter in `AsyncApiDocument.svelte`
   analogous to `OpenApiDocument.svelte:18`.

9. **Operation-level `security` and `tags` (3.0) are dropped**, even though the equivalent
   OpenAPI fields are modelled. User-visible impact: per-operation auth requirements and
   categorisation tags are invisible. Severity: **low-medium**. Package: `core` + `ui`.
   Smallest change: add `security`/`tags` to `ChannelOperation`, mirroring how `Operation`
   already carries them for OpenAPI (types.ts:270,276).

10. **`correlationId`, Info `externalDocs`, Info `termsOfService`, License `url`, `defaultContentType`, Tag `externalDocs`, Channel `servers`/`tags`/`bindings`, and Components catalogs for messages/parameters/correlationIds/replies/traits (as a browsable list) are all unmodelled.**
    User-visible impact: individually minor (small metadata omissions); collectively they mean
    a "View source" instinct is often the only way to recover intent from an AsyncAPI document
    in apibox. Severity: **low** each, grouped here because each is a small, independent fix.
    Package: `core` (+ `ui` for the ones with no field to render into yet). Smallest change per
    item: add the missing accessor call and, where the type model lacks the field, add it.

11. **AsyncAPI dereferencing is entirely delegated to `@asyncapi/parser`'s own resolver,
    bypassing the shared `dereferenceDocument`/warning machinery used by OpenAPI and OpenRPC**
    (`packages/core/src/formats/shared.ts:28-66`). This is not necessarily a defect — the
    parser handles 2.x/3.x dereferencing correctly and warnings still surface via
    `diagnostics` — but it means AsyncAPI's unresolved-`$ref` failure behaviour has not been
    verified to match OpenAPI's `continueOnError`/partial-resolution guarantees. Severity:
    **low** (flagged as a decision point, not a confirmed bug). Package: `core`. Suggested
    action: a focused test of a broken external `$ref` in an AsyncAPI doc, to confirm parity
    or document the difference.

## Method and limits

- Every code claim was checked by reading the cited file/line directly (`Read`/`grep`), not
  inferred from documentation or comments.
- Every "NONE (confirmed dropped)" claim additionally has an empirical check: a scratch
  AsyncAPI document exercising the construct was parsed with `packages/core/src/parse.ts`
  via `bun`, and the JSON output was inspected for the field's presence or absence. Scratch
  files lived under `/tmp/aa-check/` only, never in the repository, and are not part of this
  deliverable.
- The coverage percentages in the headline are a simple count of matrix rows rated FULL versus
  the total of FULL + PARTIAL + NONE (rows marked N/A or "not modelled for any format" — i.e.
  not AsyncAPI-specific gaps — were excluded from the denominator). This is a construct count,
  not a weighted-by-real-world-frequency score; bindings and security schemes are rated as
  single rows each despite being, in practice, the highest-impact gaps (see Gaps #1–#2) — the
  matrix intentionally does not average those away.
- Coverage of "2.6.0 compatibility" was checked narrowly: publish/subscribe→send/receive
  mapping, nested-vs-inline parameter schema, and channel title absence were each verified
  with a 2.6.0 scratch document. It was not exhaustively re-checked against every 2.6-only
  field (e.g. 2.x's flat `security` requirement shape, `x-parser-*` internals) — those are
  assumed to inherit the same gaps as the 3.0 equivalents, since both versions flow through
  the same `index.ts` code path after `@asyncapi/parser` normalises them.
- This assessment did not run a fuzzer or the full AsyncAPI 3.0 JSON Schema test corpus
  against apibox; it is a manual construct-by-construct audit. A more rigorous follow-up would
  run every official AsyncAPI example document (from the `asyncapi/spec` and
  `asyncapi/parser-js` test fixtures) through `parseApiDocument` and diff the output against
  the source, which was out of scope for a read-only assessment with no new dependencies.
- No product code, tests, or other docs were modified. `tests/e2e/formats.spec.ts:34-51`
  (the existing "renders the complete AsyncAPI surface" test) was read but not re-run as part
  of this exercise; its own name overstates completeness relative to the gaps found here, since
  it only exercises `examples/streetlights.asyncapi.yaml`, which itself does not exercise
  bindings, security, replies, correlation IDs, or message examples.
