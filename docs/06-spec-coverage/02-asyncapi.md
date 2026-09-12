---
title: AsyncAPI coverage
---

# AsyncAPI specification coverage

Re-assessed 2026-09-12 against AsyncAPI 3.0.0 (and the 2.6.0 compatibility path via
`@asyncapi/parser@3.6.3`), against the code as it stands after cards 18, 19, 20, 21, 34, 35 and
36. This supersedes the 2026-09-11 assessment, which scored parse at ~35% and bindings at 0% —
both figures are now stale; see "Reconciling the two prior estimates" below for why.

> **Superseded 2026-09-12.** Cards 38 to 44 closed every gap this report lists, including
> the rows scored NONE below. Constructs previously recorded as deliberate omissions —
> `$comment`, `$vocabulary`, the OpenRPC component catalogues, AsyncAPI channel tags and
> external docs, and webhook `operationRef` resolution — were re-examined, found to be
> editorial judgements rather than technical limits, and implemented. Treat the matrix below
> as the state at audit time, not as current. Re-audit before citing any figure from it.

## Headline

Since the last assessment, apibox's AsyncAPI support gained: `components.securitySchemes` plus
server- and operation-level `security`; server `variables`; message `examples` and
`correlationId`; operation `reply`/`replyAddress`; operation `tags`; channel-restricted
servers; orphan channels (channels with no operation); `info.tags`/`externalDocs`/
`termsOfService`; `license.url`; `defaultContentType`; `schemaFormat` detection (a non-JSON-Schema
payload is now recognised and honestly withheld rather than misinterpreted); protocol
**bindings at all four locations** (server, channel, operation, message), modelled generically
so every protocol is covered; broken-`$ref` resilience without losing the whole document; and a
filter for parser-injected `x-parser-*` extensions. Nearly every row the previous assessment
rated NONE for these features is now FULL, on both the parse and render side — this project's
recurring failure mode (parsed-but-never-rendered) shows up in only three rows now (channel-level
summary/description conflation, an orphan channel's own `servers` restriction, and multi-format
schema payloads), each noted below.

Of the 61 first-class object/field groups enumerated in the matrix (one more than a simple
before/after count because reply, tags, security, examples, correlationId and bindings are each
now their own row rather than folded into a "not modelled" catch-all), **47 are FULL** on parse,
**4 are PARTIAL**, and **10 are NONE**, giving parse completeness of **47/61 ≈ 77%**. On render,
excluding the one row (`isApiDocument` structural validation) that has no render-layer
equivalent, **47 are FULL**, **3 are PARTIAL**, and **10 are NONE**, giving render completeness
of **47/60 ≈ 78%**. Both percentages use the same method as the previous report: FULL /
(FULL + PARTIAL + NONE), rows marked N/A excluded from the denominator — see "Method and limits".

## Reconciling the two prior estimates

Two different numbers circulated before this re-audit: one agent said "~60-65% after cards
18/20/21", another computed "~47% from the original matrix". Both are superseded by the 77%/78%
above, and the arithmetic below shows why they landed where they did rather than agreeing:

- The **~47%** figure is consistent with applying the *original* 30-row matrix's denominator
  (FULL+PARTIAL+NONE = 30, per the 2026-09-11 doc's own "Method and limits" section) but crediting
  the newly-landed cards' FULL rows onto that smaller row count without adding the six new rows
  (reply, tags, examples, correlationId, security, bindings-as-a-family) that the cards
  introduced: roughly 14 FULL / 30 ≈ 47%. That undercounts because it does not expand the
  denominator to match the surface area the cards actually added.
- The **~60-65%** figure plausibly came from crediting bindings as a single "done" row covering
  all four locations and every protocol (reasonable, since the model is generic) while still
  using something close to the original ~30-row denominator, landing in the 18-20/30 range.
- This report's **77%/61 rows** figure differs from both by explicitly enumerating every field
  the two AsyncAPI-specific interface mixins (`TagsMixinInterface`, `ExternalDocumentationMixinInterface`,
  `TitleMixinInterface`, `BindingsMixinInterface`, `DescriptionMixinInterface` — see
  `node_modules/@asyncapi/parser/cjs/models/mixins.d.ts`) expose per object, rather than folding
  several fields into one row once "most of it" is done. That is why the denominator grew from
  30 to 61 even though almost every *new* row is FULL: the matrix now separately counts, for
  example, "server tags" (still NONE) apart from "server bindings" (now FULL) where the original
  matrix had bundled both into a single "tags, bindings" row rated NONE.

None of the three prior numbers is wrong given its own scope; they used different denominators.
This report's number is defensible because every row is independently justified against a
`path:line` citation below, and the row list is the original list plus the specific new fields
the landed cards added — nothing was merged back together to flatter the ratio.

## Coverage matrix

| Construct | Spec version | Parse | Render | Evidence (path:line) | Notes |
|---|---|---|---|---|---|
| AsyncAPI Object: `asyncapi` version | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:287` (`specVersion: document.version()`); `packages/ui/src/organisms/DocumentHeader.svelte:28-29` | |
| AsyncAPI Object: `id` (application URI) | 3.0 | NONE | NONE | `InfoInterface.id()`/`hasId()` exist on the parser's own typed model (`node_modules/@asyncapi/parser/cjs/models/info.d.ts`) but no call site reads them in `packages/core/src/formats/asyncapi/index.ts`; `AsyncApiDocument` (types.ts:642-651) has no such field | apibox's own doc `id` (types.ts:290) is an internal slug, not this |
| AsyncAPI Object: `defaultContentType` | 2.6/3.0 | FULL | FULL | parsed at `packages/core/src/formats/asyncapi/index.ts:310` and applied as the per-message fallback at `index.ts:600` (`message.contentType() ?? defaultContentType`); rendered via the message's own `contentType` chip, `AsyncApiMessage.svelte:18-20` | it has no dedicated UI row of its own — its only reader-facing effect is filling in a message's content type when the message declares none, which is what the field is for |
| Info: `title`, `version` | 2.6/3.0 | FULL | FULL | `packages/core/src/formats/asyncapi/index.ts:129-130`; `packages/ui/src/organisms/DocumentHeader.svelte:31,38` | |
| Info: `description` | 2.6/3.0 | FULL | FULL | `index.ts:290`; `DocumentHeader.svelte:33-35` | |
| Info: `termsOfService` | 2.6/3.0 | FULL | FULL | `index.ts:304` (`info.hasTermsOfService() ? info.termsOfService() : undefined`); `DocumentHeader.svelte:72-77` | landed since the last audit |
| Info: `contact` | 2.6/3.0 | FULL | FULL | `index.ts:291-299` via `parseContact`; `DocumentHeader.svelte:39-53` | |
| Info: `license.name` | 2.6/3.0 | FULL | FULL | `index.ts:300-302`; `DocumentHeader.svelte:54-63` | |
| Info: `license.url` | 3.0 | FULL | FULL | `index.ts:300-302` now calls `license.hasUrl() ? license.url() : undefined`; `DocumentHeader.svelte:56-59` | landed since the last audit; AsyncAPI's own License Object has no 3.2 `identifier` field (unlike OpenAPI's), confirmed via `node_modules/@asyncapi/parser/cjs/models/license.d.ts` — nothing to model there |
| Info: `tags` | 2.6/3.0 | FULL | FULL | `index.ts:171-179`; `packages/ui/src/renderers/asyncapi/AsyncApiDocument.svelte:29-46` | landed since the last audit — the old doc's "parsed but never rendered" gap for this field is closed |
| Info: `externalDocs` | 2.6/3.0 | FULL | FULL | `index.ts:303` (`info.hasExternalDocs() ? toExternalDocs(info.externalDocs()) : undefined`); `DocumentHeader.svelte:65-70` | landed since the last audit |
| Servers: `host`/`url`, `protocol`, `description` | 2.6/3.0 | FULL | FULL | `index.ts:148-155`; `packages/ui/src/organisms/ServerList.svelte:21-23` | |
| Servers: `protocolVersion` | 2.6/3.0 | NONE | NONE | `ServerInterface.protocolVersion()`/`hasProtocolVersion()` exist on the parser's typed model (`node_modules/@asyncapi/parser/cjs/models/server.d.ts`) but are not called anywhere in `index.ts:148-169`; `ServerInfo` (types.ts:204-226) has no such field | still unmodelled — a typed, ready-to-read accessor, unlike `id`/row above |
| Servers: `pathname` (3.0) | 3.0 | NONE | NONE | `ServerInterface.pathname()`/`hasPathname()` exist (same file) but are not called; no such field on `ServerInfo` | |
| Servers: `variables` | 2.6/3.0 | FULL | FULL | `index.ts:156-163`; `ServerList.svelte:24-33` | landed since the last audit — closes what was a parsed-nothing/rendered-dead-code gap |
| Servers: `security` | 2.6/3.0 | FULL | FULL | `index.ts:164-167` via `toSecurityRequirements`; `ServerList.svelte:34-43` | landed since the last audit |
| Servers: `tags` | 3.0 | NONE | NONE | `ServerInterface` extends `TagsMixinInterface` (`node_modules/@asyncapi/parser/cjs/models/server.d.ts:4`), so `server.tags()` is a typed, working accessor, but no call site in `index.ts:148-169` reads it; `ServerInfo` has no `tags` field | typed and available, simply not wired — smaller lift than the channel-tags gap below, which is untyped |
| Servers: `bindings` | 3.0 | FULL | FULL | `index.ts:168` (`toBindings(safe(() => server.bindings()))`); `ServerList.svelte:44` | landed since the last audit |
| Channels: `address` | 3.0 (2.x: channel key) | FULL | FULL | `index.ts:194` (via operation's channel), `index.ts:259` (orphan channels); `packages/ui/src/renderers/asyncapi/AsyncApiOperationCard.svelte:33` | |
| Channels: `title` | 3.0 only | PARTIAL | FULL when present | `readTitle` (`index.ts:533-536`) casts past the typed model — `ChannelInterface` has no `TitleMixinInterface` in its extends list (`node_modules/@asyncapi/parser/cjs/models/channel.d.ts`) even though the concrete class inherits `title()` at runtime from `CoreModel` — because 2.x channels have no title at all; rendered at `AsyncApiOperationCard.svelte:26` (fallback chain) and `AsyncApiDocument.svelte:68` (orphan channels) | correct handling of a genuine 2.x/3.x asymmetry, not a bug |
| Channels: `summary`, `description` | 2.6/3.0 | PARTIAL | PARTIAL | For a channel with an operation, only the *operation's* `summary`/`description` are read (`index.ts:196-197`) — a channel `description` with no operation-level description is lost. For an **orphan** channel, `channel.description()` itself is read (`index.ts:261`) — `ChannelInterface` does carry `description()` via `DescriptionMixinInterface` (`node_modules/@asyncapi/parser/cjs/models/channel.d.ts:8`), it is just not consulted on the operation path | half-fixed: the accessor exists and is used for orphan channels, but the two paths (operation-attached vs. orphan) still disagree on whose description wins |
| Channels: `messages` | 2.6/3.0 | FULL | FULL | via `operation.messages().all()` (`index.ts:199-204`) | |
| Channels: `parameters` | 2.6/3.0 | FULL | FULL | `parseChannelParameters` (`index.ts:540-550`); `packages/ui/src/organisms/ParameterTable.svelte` | |
| Channels: `servers` (restriction) | 3.0 | FULL (operation path) / PARTIAL (orphan path) | FULL (operation path) / NONE (orphan path) | For an operation's channel: parsed at `index.ts:217-226` into `channelServers`, rendered at `AsyncApiOperationCard.svelte:37-41`. For an **orphan** channel: parsed identically into `ChannelInfo.servers` (`index.ts:263-270`), but `AsyncApiDocument.svelte:66-76`'s orphan-channel block never reads `channel.servers` — confirmed by reading that block in full, no reference to `.servers` anywhere in it | small, self-contained render gap: the field is already on the model, `AsyncApiOperationCard.svelte:37-41` shows the exact markup to copy |
| Channels: `tags`, `externalDocs` | 2.6/3.0 | NONE | NONE | `ChannelInterface`'s extends list is only `BindingsMixinInterface, DescriptionMixinInterface, ExtensionsMixinInterface` (`node_modules/@asyncapi/parser/cjs/models/channel.d.ts:7`) — no `TagsMixinInterface`, no `ExternalDocumentationMixinInterface`. The concrete `Channel` class still inherits both at runtime via `CoreModel` (`node_modules/@asyncapi/parser/cjs/models/v3/mixins.js`), but reading them would mean bypassing the typed model the way `readTitle` already does for `title` — a deliberate omission, not an oversight (this is the specific gap the audit brief called out) | going through the typed interface, `channel.tags()`/`channel.externalDocs()` do not exist; reaching them requires the same untyped cast `readTitle` uses |
| Channels: `bindings` | 3.0 | FULL | FULL | `channel.bindings()` at `index.ts:228` (via the operation) and `index.ts:271` (orphan channels); rendered at `AsyncApiOperationCard.svelte:55-59` (`channelBindings`) and `AsyncApiDocument.svelte:74` | landed since the last audit; unlike tags/externalDocs above, `bindings()` *is* in `ChannelInterface`'s typed extends list, so no cast was needed |
| Channels with zero operations | 2.6/3.0 | FULL | FULL | `index.ts:251-273` walks `document.channels().all()` and filters to those with no operations; rendered as a "Channels" section, `AsyncApiDocument.svelte:57-78`; covered by `packages/core/src/parse.test.ts:1282-1287` | landed since the last audit — closes what was a "disappears entirely" gap |
| Parameters: `enum`, `default`, `description` (3.0 inline shape) | 3.0 | FULL | FULL | `parameterSchema` (`index.ts:560-564`); rendered via `SchemaTypeLabel`/`ParameterTable` | |
| Parameters: `location` (3.0 RFC 6901 pointer) | 3.0 | NONE | NONE | not read; every AsyncAPI parameter is hard-coded `in: 'path'` (`index.ts:545`) | reasonable default (3.0 parameters are always address-template substitutions), but a `location` pointing elsewhere is not honoured |
| Message: `name`, `title`, `summary`, `description`, `contentType` | 2.6/3.0 | FULL | FULL | `toMessageInfo` (`index.ts:566-614`); `packages/ui/src/renderers/asyncapi/AsyncApiMessage.svelte:16-20` | |
| Message: `payload` (default `schemaFormat`) | 2.6/3.0 | FULL | FULL | `index.ts:574-577,601`; `AsyncApiMessage.svelte:27-29` via `SchemaViewer` | see the multi-format row below for a non-default `schemaFormat` |
| Message: `headers` | 2.6/3.0 | FULL | FULL | `index.ts:578-581,603`; `AsyncApiMessage.svelte:35-37` | |
| Message: `correlationId` | 2.6/3.0 | FULL | FULL | `index.ts:593,606-611`; `AsyncApiMessage.svelte:21-26` | landed since the last audit |
| Message: `examples` | 2.6/3.0 | FULL | FULL | `toExamples` (`index.ts:605,636-646`); `AsyncApiMessage.svelte:43-45` via `ExampleViewer` | landed since the last audit |
| Message: `tags`, `externalDocs` | 2.6/3.0 | NONE | NONE | `MessageTraitInterface` (which `MessageInterface` extends) *does* carry `TagsMixinInterface` and `ExternalDocumentationMixinInterface` (`node_modules/@asyncapi/parser/cjs/models/message-trait.d.ts:6`) — both are typed, working accessors — but `toMessageInfo` (`index.ts:566-614`) never calls `message.tags()`/`message.externalDocs()`, and `MessageInfo` (types.ts:560-587) has no such fields | unlike channel tags, this is a typed accessor sitting unused, not a typed-model gap — cheaper to close |
| Message: `bindings` | 2.6/3.0 | FULL | FULL | `index.ts:612`; `AsyncApiMessage.svelte:46` | landed since the last audit |
| MessageTrait | 2.6/3.0 | FULL (merged) | FULL (merged) | not modelled explicitly — `@asyncapi/parser` applies traits before the effective-value accessors return, so `toMessageInfo` sees post-trait values automatically | unchanged from the previous audit |
| Operation: `action` (`send`/`receive`, 2.x `publish`/`subscribe`) | 2.6/3.0 | FULL | FULL | `index.ts:187,193`; `AsyncApiOperationCard.svelte:19-24` (badge) | |
| Operation: `channel` reference | 2.6/3.0 | FULL | FULL | `operation.channels().all()[0]` (`index.ts:186`) | |
| Operation: `summary`, `description` | 2.6/3.0 | FULL | FULL | `index.ts:196-197`; `AsyncApiOperationCard.svelte:25-27,34-36` | Operation itself has no distinct `title` field in the spec or the parser's typed model — `OperationTraitInterface` (`node_modules/@asyncapi/parser/cjs/models/operation-trait.d.ts`) has no `TitleMixinInterface` — only the channel does (see the Channels: `title` row); the heading fallback chain (`summary ?? channelTitle ?? channelAddress`, `AsyncApiOperationCard.svelte:26`) is therefore complete, not missing a field |
| Operation: `security` | 2.6/3.0 | FULL | FULL | `index.ts:205-208` via `toSecurityRequirements`; `AsyncApiOperationCard.svelte:43-52` | landed since the last audit |
| Operation: `tags` | 3.0 (2.x: on publish/subscribe) | FULL | FULL | `index.ts:209-216`; `AsyncApiOperationCard.svelte:28-30` | landed since the last audit — typed via `OperationTraitInterface`'s `TagsMixinInterface` |
| Operation: `bindings` | 2.6/3.0 | FULL | FULL | `index.ts:227`; `AsyncApiOperationCard.svelte:60` | landed since the last audit |
| Operation: `reply` / `OperationReply` / `OperationReplyAddress` | 3.0 only | FULL | FULL | `index.ts:188,229-243`; `AsyncApiOperationCard.svelte:65-81` | landed since the last audit — request/reply (Kafka/AMQP RPC patterns) is now visible |
| Operation: `messages` (subset selection) | 2.6/3.0 | FULL | FULL | `operation.messages().all().map(toMessageInfo)` (`index.ts:199-204`) | |
| OperationTrait | 2.6/3.0 | FULL (merged) | FULL (merged) | same trait-merging mechanism as MessageTrait | unchanged |
| Components: `schemas` | 2.6/3.0 | FULL | FULL | `document.components().schemas().all()` (`index.ts:275-280`); `SchemaCatalog.svelte` | |
| Components: `messages`, `parameters`, `correlationIds`, `replies`, `replyAddresses`, `operationTraits`, `messageTraits` (as a standalone browsable catalog) | 2.6/3.0 | NONE | NONE | never iterated directly — only ever reached indirectly when a channel/operation/message references them; no components-catalog page/section exists anywhere in `packages/ui/src/renderers/asyncapi` | unchanged — a reader still cannot browse "everything defined in `components`" independent of where it is used |
| Components: `securitySchemes` | 2.6/3.0 | FULL | FULL | `index.ts:137-146,309`; `AsyncApiDocument.svelte:27` mounts the same `SecuritySchemes.svelte` OpenAPI uses | landed since the last audit — closes what was the highest-severity gap in the previous report |
| Components: `serverVariables`, `serverBindings`, `channelBindings`, `operationBindings`, `messageBindings`, `externalDocs`, `tags` (reusable component catalogs) | 3.0 | NONE | NONE | never referenced in `index.ts` as a standalone catalog | unlike `components.securitySchemes`, no code path resolves a `$ref` into one of these catalogs and lists it separately — they would only ever surface indirectly wherever something references them, and nothing currently does |
| Tag Object (`name`, `description`) | 2.6/3.0 | FULL | FULL | `index.ts:171-179`; `AsyncApiDocument.svelte:29-46` | landed since the last audit (previously parsed but not rendered) |
| Tag Object: `externalDocs` | 2.6/3.0 | FULL | FULL | `index.ts:178` (`tag.hasExternalDocs() ? toExternalDocs(tag.externalDocs()) : undefined`); `AsyncApiDocument.svelte:37-41` | landed since the last audit |
| Reference Object (`$ref`) | 2.6/3.0 | FULL (resolved) / explicit marker on broken refs | FULL / explicit-unresolved-marker on failure | resolution is delegated to `@asyncapi/parser`'s own dereferencing; a broken `$ref` no longer takes down the whole document — see the module doc comment at `index.ts:63-88` and the `dropInvalidatingMarkers`/`stubUnresolvedRef`/`restoreUnresolvedRefs` machinery (`index.ts:317-479`) | materially hardened since the last audit (card 34/35): previously a single broken `$ref` threw and lost the entire document; now it degrades to a per-field marker like OpenAPI/OpenRPC's `unresolvedRef` |
| Schema Object — core JSON Schema keywords | 2.6/3.0 (AsyncAPI-flavoured 2020-12) | FULL | FULL | shared with OpenAPI/OpenRPC: `packages/core/src/schema.ts:52-284` | |
| Schema Object — multi-format schemas (`schemaFormat`: Avro, Protobuf, OpenAPI Schema, RAML, etc.) | 2.6/3.0 | PARTIAL | PARTIAL | `normalisePayloadLike` (`index.ts:616-634`) now reads `schemaFormat()` and, when it is not the AsyncAPI default, deliberately withholds the schema rather than misinterpreting it (`{ format }` with no `schema`); rendered as an explicit "Payload is …, not JSON Schema — not rendered" notice (`AsyncApiMessage.svelte:30-34,38-42`) | improved from NONE (silently-wrong misinterpretation) to PARTIAL (honestly absent, with a labelled reason) — the underlying Avro/Protobuf/RAML structure itself is still never shown, by design; see Gap #1 below for what "full" would need |
| CorrelationId Object | 2.6/3.0 | FULL | FULL | see Message: `correlationId` row | landed since the last audit |
| Security Scheme Object (all types: apiKey, http, oauth2, openIdConnect, userPassword, X509, symmetricEncryption, asymmetricEncryption, httpApiKey, scramSha256/512, plain, gssapi) | 2.6/3.0 | FULL | FULL | `toSecuritySchemeInfo` (`index.ts:710-725`) reads `type`/`description`/`in`/`name`/`scheme`/`bearerFormat`/`openIdConnectUrl`/`flows` generically via `has*`-guarded optional accessors; types with no extra fields beyond `type`/`description` (userPassword, X509, symmetricEncryption, asymmetricEncryption, gssapi, plain, scramSha256/512) need nothing more and get it; rendered via `packages/ui/src/organisms/SecuritySchemes.svelte` | landed since the last audit |
| Bindings — all protocols, all four locations | 2.6/3.0 | FULL (generic) | FULL (generic) | see "Bindings coverage" section below | landed since the last audit — was 0% in the previous report |
| Specification Extensions (`x-*`) | 2.6/3.0 | NONE | NONE | `isExtensionKey` (`packages/core/src/formats/shared.ts:293`) is used only by OpenAPI response-key filtering — no AsyncAPI call site reads it; `extensions()` is a typed, working accessor on nearly every AsyncAPI model via `ExtensionsMixinInterface` (`node_modules/@asyncapi/parser/cjs/models/mixins.d.ts:7-9`), but nothing in `index.ts` calls it | unchanged from the previous audit; distinct from `x-parser-*`, which is filtered (`PARSER_INJECTED_EXTENSION_KEYS`, `index.ts:48-61`) as internal parser machinery, not a document-authored extension |
| Document-level `warnings` (non-fatal diagnostics) | 2.6/3.0 | FULL | FULL | `index.ts:93,116-120`; `DocumentHeader.svelte:81-90` | unchanged |
| Structural round-trip validation (`isApiDocument`) | n/a (apibox-internal) | PARTIAL | N/A | `isAsyncOperation` (`packages/core/src/validate.ts:344-365`) still checks only `id`, `action`, `channelAddress`, `parameters`, `messages` — no awareness of `security`, `tags`, `bindings`, `reply`, `channelServers`, or `channelBindings`; the document-level `asyncapi` case in `isApiDocument` (`validate.ts:451-456`) checks only `operations`, not `securitySchemes`, `orphanChannels`, or `defaultContentType` | validation did not track the cards that landed — it is only as complete as the type model it happened to check before those cards shipped |

## Bindings coverage

AsyncAPI's Bindings Object family (one binding object per protocol, attachable to Server,
Channel, Operation and Message) is a large, protocol-specific surface — the spec ships a
distinct schema per protocol (amqp, amqp1, anypointmq, googlepubsub, http, ibmmq, jms, kafka,
mercure, mqtt, mqtt5, nats, pulsar, redis, sns, solace, sqs, stomp, ws, and others via community
bindings). This was the previous report's single largest gap (0% — nothing was read, modelled,
or rendered anywhere). It is now covered generically.

| Protocol | Server bindings | Channel bindings | Operation bindings | Message bindings | Evidence |
|---|---|---|---|---|---|
| Any/all protocols | FULL | FULL | FULL | FULL | `toBindings` (`packages/core/src/formats/asyncapi/index.ts:668-684`) reads `binding.protocol()`, `binding.version()` and every entry of `binding.value()` as an opaque `{ key, value }` bag, for whichever protocol the document declared, at whichever of the four locations declared it. Wired at: server (`index.ts:168`), channel via operation (`index.ts:228`), operation (`index.ts:227`), message (`index.ts:612`), and orphan channel (`index.ts:271`). Rendered by `packages/ui/src/organisms/BindingList.svelte` (mounted from `ServerList.svelte:44`, `AsyncApiOperationCard.svelte:55-60`, `AsyncApiMessage.svelte:46`, `AsyncApiDocument.svelte:74`). Test coverage: `packages/core/src/parse.test.ts:1572-1813` (MQTT, Kafka, NATS-with-no-parser-specific-code, `bindingVersion` defaulting, and interaction with the broken-`$ref`/security-scheme-identity fixes) and `:1850-1912` (AMQP on a 2.x document). |

**What "every protocol" gets you, and what it does not.** `BindingInfo` is deliberately generic
— `{ protocol, version, fields: Array<{ key, value }> }` — rather than one typed shape per
protocol (`types.ts:241-259` explains why: AsyncAPI defines dozens of protocols with no shared
shape and adds more over time, and a hand-modelled union would cover a fixed handful properly
while silently dropping every protocol not enumerated). The consequence, stated plainly:

- A reader sees every field the document declared for a binding, at the right location, labelled
  with the protocol name and `bindingVersion` (`BindingList.svelte:38-70`).
- A reader does **not** get protocol-aware labelling (e.g. Kafka's `groupId`/`clientId` given
  human-readable names, or a note on which fields are required per the Kafka binding schema) or
  unit-aware formatting (e.g. MQTT's `qos` shown as an integer 0/1/2 rather than "At most once" /
  "At least once" / "Exactly once"; a byte-count field shown as a bare number rather than "4 KB").
  Every field value is shown as either its raw string or `JSON.stringify`'d (`BindingList.svelte:33-35`)
  — a nested object (e.g. Kafka's `groupId` schema, which is itself a JSON Schema) renders as
  compact JSON text, not walked further.
- This is a defensible "80/20": full protocol-aware rendering for ~20 protocols would be a much
  larger, ongoing surface (new protocols and new binding fields ship regularly) for a benefit
  that is mostly cosmetic once the raw data is visible at all, which it now is.

## Gaps

Ordered by severity, using severity as **impact if unfixed** rather than **effort to fix** — several
of the low-severity items below are also the cheapest to close.

1. **Multi-format schemas (`schemaFormat`: Avro, Protobuf, OpenAPI Schema, RAML, etc.) are
   detected but never actually shown — only a "not JSON Schema" notice.** User-visible impact:
   a Kafka/Avro-heavy AsyncAPI document (a common real-world pairing) shows every payload as an
   inert placeholder rather than its native structure. Severity: **medium** — down from the
   previous report's rating, because the failure mode changed from *silently wrong* (misread as
   JSON Schema) to *honestly absent*, which is a real improvement, but the data is still not shown.
   Package: `core` (to parse the native format, e.g. an Avro schema parser) + `ui` (to render it,
   likely as its own component parallel to `SchemaViewer`). Smallest change that only closes part
   of the gap without a new parsing dependency: render the raw payload JSON verbatim (not
   walked as JSON Schema, just shown) instead of only a text notice — better than nothing, but
   not "full" Avro/Protobuf support.

2. **`components` catalogs (messages, parameters, correlationIds, replies, replyAddresses,
   operationTraits, messageTraits, and the 3.0-only serverVariables/serverBindings/
   channelBindings/operationBindings/messageBindings/externalDocs/tags) are not browsable as
   catalogs.** User-visible impact: a document that defines a large, reusable component library
   (common in enterprise AsyncAPI usage, mirroring OpenAPI's `components.schemas` catalog) has no
   equivalent "browse everything defined here" page — only whatever happens to be referenced
   from an operation/channel/message. Severity: **medium**. Package: `core` + `ui`. Smallest
   change: for `components.securitySchemes`, apibox already proves the pattern (`index.ts:137-146`,
   `SecuritySchemes.svelte`) — extend the same shape to `components.messages` first, since
   `MessageInfo`/`AsyncApiMessage.svelte` already exist and only need a catalog wrapper.

3. **Channel `tags` and `externalDocs` are unmodelled because `ChannelInterface`'s typed
   extends list omits `TagsMixinInterface`/`ExternalDocumentationMixinInterface`, even though
   the concrete parser class answers both at runtime via `CoreModel`.** User-visible impact:
   channel-level categorisation and documentation links are invisible; operation-level `tags`
   (now FULL) do not substitute for this, since a channel can carry its own tags independent of
   any operation. Severity: **medium**. Package: `core`. Smallest change: cast past the typed
   model the same way `readTitle` (`index.ts:533-536`) already does for `title` — this is not a
   parser limitation, only a decision apibox made not to read past its own type declarations for
   these two fields; a one-line follow-up to `readTitle`'s existing pattern would close it.

4. **Message `tags` and `externalDocs` are unmodelled, unlike Message `bindings`/`correlationId`/
   `examples`, which now are.** User-visible impact: a message-level tag or docs link is
   invisible. Severity: **low-medium**. Package: `core` + `ui` (add fields to `MessageInfo`,
   render in `AsyncApiMessage.svelte`). Smallest change: unlike the channel-tags gap above, this
   one needs no cast — `message.tags()`/`message.externalDocs()` are already typed via
   `MessageTraitInterface` (`node_modules/@asyncapi/parser/cjs/models/message-trait.d.ts:6`); it
   is purely a missing call site plus a missing field on `MessageInfo`.

5. **Server `tags`, `protocolVersion`, `pathname` are unmodelled**, despite `tags()` being typed
   the same low-effort way as #4 above and `protocolVersion()`/`pathname()` being plain typed
   string accessors with no cast required. User-visible impact: individually minor metadata
   (a server's protocol version, its base path, its categorisation tags) is invisible.
   Severity: **low**. Package: `core` (+ `ui` for `tags`, which has nowhere to render into yet).
   Smallest change: three more field reads in the servers map (`index.ts:148-169`), mirroring
   how `variables`/`security`/`bindings` were just added there.

6. **Orphan channels drop their own `servers` restriction on render**, even though it is parsed
   (`ChannelInfo.servers`, `index.ts:263-270`) the same way the operation-attached path renders
   it (`AsyncApiOperationCard.svelte:37-41`). User-visible impact: a documentation-only channel
   restricted to specific servers looks available everywhere. Severity: **low** (orphan channels
   restricted to specific servers are a narrow combination). Package: `ui`. Smallest change: copy
   `AsyncApiOperationCard.svelte:37-41`'s markup into `AsyncApiDocument.svelte`'s orphan-channel
   block (around line 69).

7. **Channel-attached (non-orphan) `summary`/`description` still come only from the operation,
   not the channel itself**, even though orphan channels now read `channel.description()`
   directly (`index.ts:261`). User-visible impact: a channel with its own `description` and an
   operation with a *different* (or no) `description` shows only the operation's version, or
   nothing. Severity: **low**. Package: `core`. Smallest change: fall back to
   `channel.description()` when the operation has none, in the operations map (`index.ts:196-197`).

8. **Parameter `location` (3.0 RFC 6901 pointer, letting a parameter reference something other
   than the channel address) is not honoured** — every parameter is hard-coded `in: 'path'`.
   Severity: **low** (this is the common case; `location` pointing elsewhere is rare in
   practice). Package: `core`. Smallest change: read `location()` when present and adjust the
   parameter's `in`/description accordingly.

9. **AsyncAPI `id` (the application's own URI, distinct from apibox's internal slug) and
   Specification Extensions (`x-*`) remain entirely unmodelled.** User-visible impact:
   individually minor. Severity: **low** each. Package: `core` (+ `ui` for extensions, which has
   no rendering slot). Smallest change per item: for `id`, one field read plus one type-model
   field; for extensions, reuse `isExtensionKey`/an equivalent generic pass the way `BindingList`
   already renders an arbitrary key/value bag, applied to `model.extensions()` at each of the
   object kinds that carry one.

10. **Structural validation (`isApiDocument`/`isAsyncOperation`, `packages/core/src/validate.ts:344-365,451-456`)
    was not updated alongside cards 18-21/34-36 and does not check `security`, `tags`, `bindings`,
    `reply`, `channelServers`, `channelBindings`, `securitySchemes`, `orphanChannels`, or
    `defaultContentType`.** User-visible impact: none directly (this is a defence-in-depth
    check, not a rendering path), but it means a future regression in any of these newly-landed
    fields would not be caught by `isApiDocument`. Severity: **low** (as a present-day bug) but
    worth flagging as process debt — a validation function is only as good as its last update.
    Package: `core`. Smallest change: extend `isAsyncOperation` and the `asyncapi` case of
    `isApiDocument` to check the fields the cards added, mirroring how OpenAPI's checks already
    cover its own `security`.

11. **AsyncAPI dereferencing remains entirely delegated to `@asyncapi/parser`'s own resolver**,
    now hardened (card 34/35) against a single broken `$ref` losing the whole document, but still
    a separate code path from the shared `dereferenceDocument`/warning machinery OpenAPI and
    OpenRPC use (`packages/core/src/formats/shared.ts:28-66`). This is a design note, not a
    confirmed defect — behaviour was explicitly tested for broken refs
    (`packages/core/src/parse.test.ts:1759-1812`) — flagged here only because it means a future
    change to `continueOnError` semantics elsewhere would not automatically apply to AsyncAPI.
    Severity: **low** (documented, tested divergence, not a gap). Package: `core`. No action
    needed unless the two paths are meant to converge.

## Method and limits

- Every code claim was checked by reading the cited file/line directly (`Read`/`grep`), including
  the `@asyncapi/parser` package's own `.d.ts` interface files under
  `node_modules/.bun/@asyncapi+parser@3.6.3/node_modules/@asyncapi/parser/cjs/models/` — this is
  new relative to the previous audit, and is what let this report distinguish "the parser
  exposes this field but apibox doesn't read it" (a smaller fix) from "the parser's typed
  interface for this object doesn't expose this field at all" (a fix that requires bypassing the
  type model, as `readTitle` already does for one field).
- Test coverage was checked and cited per row where it exists (`packages/core/src/parse.test.ts`),
  rather than re-run from scratch — the repository's own `bun test` was not invoked as part of
  this audit; citations point at existing, named tests a reader can run themselves.
- The coverage percentages are a simple count of matrix rows rated FULL versus the total of
  FULL + PARTIAL + NONE, exactly as the previous report computed it — see "Reconciling the two
  prior estimates" above for why the row count (denominator) changed from 30 to 61 rather than
  the method itself changing. This is a construct count, not a score weighted by real-world
  frequency; the bindings section intentionally keeps its own detailed sub-table rather than
  averaging protocol-level nuance away.
- Coverage of "2.6.0 compatibility" was spot-checked via the dedicated `describe('AsyncAPI 2.x', ...)`
  block (`packages/core/src/parse.test.ts:1813` onward), which covers publish/subscribe mapping,
  AMQP bindings on a 2.x channel/operation/message, server variables in 2.x's map form, and
  `$ref`-to-`components.tags` resolution — a materially larger slice of 2.x-specific behaviour
  than the previous audit checked, though still not exhaustive against every 2.x-only field.
- This assessment did not run a fuzzer or the full AsyncAPI 3.0 JSON Schema test corpus against
  apibox; it remains a manual, construct-by-construct audit, cross-checked against the parser
  library's own typed interfaces rather than only its documentation.
- No product code, tests, or other docs were modified as part of this audit.
