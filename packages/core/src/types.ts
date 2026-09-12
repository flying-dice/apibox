/**
 * The normalised document model.
 *
 * Every supported specification format is parsed down to one of the `ApiDocument`
 * variants below. The renderers in `@apibox/ui` only ever see this model — they never
 * touch a raw OpenAPI or AsyncAPI object. That boundary is what lets a fourth format be
 * added later without reopening the UI.
 */

export type FormatId = 'openapi' | 'asyncapi' | 'jsonrpc' | 'jsonschema';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A JSON Schema flattened into a shape that renders directly.
 *
 * All three formats describe their payloads with JSON Schema, so they all normalise into
 * this one tree and share a single `SchemaViewer`. Composition keywords are preserved
 * rather than merged: showing a reader "one of these three shapes" is more honest than
 * showing them a synthesised union that appears nowhere in the spec.
 */
export interface SchemaNode {
  /** Property name, array item label, or `undefined` at the root. */
  name?: string;
  /** The schema's own `title`, if it had one. */
  title?: string;
  /** JSON Schema types. An array when the schema permits several. */
  types: string[];
  format?: string;
  description?: string;
  /**
   * \`$comment\`: an authoring note the spec says a validator MUST NOT surface to a consumer
   * as part of validation results. That rule constrains what an *author* may rely on a
   * *validator* doing with it -- it says nothing about a documentation tool showing what a
   * document contains, which is the whole point of apibox. Kept distinct from
   * \`description\` -- never concatenated with it -- so a renderer can label it as the
   * non-normative authoring note it is and a reader is never left mistaking one for the
   * other.
   */
  comment?: string;
  /**
   * The content vocabulary: \`contentEncoding\` and \`contentMediaType\`, annotating a string
   * instance as encoded structured content (a base64-encoded PNG, an embedded JWT, ...). Kept
   * as plain strings, same as \`format\`, since both are annotations a reader scans for
   * rather than structure to expand.
   */
  contentEncoding?: string;
  contentMediaType?: string;
  /**
   * \`contentSchema\`: the shape of the *decoded* content named by \`contentMediaType\`, e.g. a
   * base64 field whose decoded bytes are themselves a JSON document. Nests like
   * \`propertyNames\`/\`contains\` rather than living in \`constraints\`, because it is itself a
   * schema with its own structure to expand, not a scalar annotation.
   */
  contentSchema?: SchemaNode;
  /** True when the parent listed this property in `required`. */
  required?: boolean;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  nullable?: boolean;
  /** `default`, rendered verbatim. */
  default?: unknown;
  /** Permitted values, from `enum` or a single-valued `const`. */
  enum?: unknown[];
  /** Examples from `examples` or a singular `example`. */
  examples?: unknown[];
  /** Rendered as a chip row: `minLength: 1`, `format: uuid`, `pattern: ^\d+$`, … */
  constraints?: SchemaConstraint[];
  /** Object properties, in declaration order. */
  properties?: SchemaNode[];
  /** The schema for `additionalProperties`, when it is a schema rather than a boolean. */
  additionalProperties?: SchemaNode;
  /**
   * Whether unlisted properties are permitted. `false` means the schema is closed and must
   * be rendered as such; `undefined` means the document did not say, which JSON Schema
   * treats as permissive. The two are deliberately distinct — a reader needs to know the
   * difference between "no extra fields allowed" and "unspecified".
   */
  allowsAdditionalProperties?: boolean;
  /** Array item schema, for a uniformly typed array. */
  items?: SchemaNode;
  /**
   * Positionally typed array entries, from draft-4 array-form `items` or 2020-12
   * `prefixItems`. When set, `items` (if also present) types the entries beyond the tuple.
   */
  tupleItems?: SchemaNode[];
  /**
   * Composition keywords, in the order encountered. A schema may carry several at once —
   * `allOf` for a mixin plus `oneOf` for a variant is a common pattern — so this is a list
   * rather than a single entry.
   */
  compositions?: Composition[];
  /**
   * Set when this node is a back-reference to an ancestor, which happens with recursive
   * schemas such as a tree node or Petstore's `Pet.parent`. Renderers must stop here and
   * offer a link instead of descending, or they will recurse forever.
   */
  circularRef?: string;
  /**
   * The raw `$ref` pointer, set when a reference could not be resolved — a broken external
   * URL, say. Rendering it as an explicit unresolved marker is the point: the alternative
   * is an empty schema that looks like the document genuinely described nothing.
   */
  unresolvedRef?: string;
  /** The component name this schema came from, when it was a named component. */
  refName?: string;
  /**
   * This schema's own \`$id\` (or draft-04 \`id\`), when it declares one *itself* rather than
   * inheriting the document root's. A bundle that combines many schemas into one file
   * commonly gives each \`$defs\` entry its own \`$id\` so it can be independently addressed --
   * without this, a reader has no way to see that. The document root's own \`$id\` is still
   * surfaced separately on \`JsonSchemaDocument.schemaId\`; this field is stripped from the
   * root node to avoid showing the same value twice.
   */
  schemaId?: string;
  /** \`$anchor\`: a plain fragment name this schema can be \`$ref\`'d by, within its document. */
  anchor?: string;
  /**
   * \`$dynamicRef\`/\`$dynamicAnchor\`: the 2020-12 extensible-vocabulary mechanism, where the
   * schema actually resolved at a \`$dynamicRef\` site depends on the outermost schema in the
   * resolution scope that declares a matching \`$dynamicAnchor\`, not lexical nesting. apibox
   * does not attempt that resolution -- it is genuinely dynamic, decided per evaluation, not
   * a fixed target this renderer could point at -- so both are surfaced as the raw keyword
   * value a reader needs to reason about the mechanism themselves.
   */
  dynamicRef?: string;
  dynamicAnchor?: string;
  /**
   * `if`/`then`/`else`, preserved as the conditional triple the document actually wrote
   * rather than resolved to a single branch — the model has no way to know which branch a
   * given instance would take, and guessing would be worse than showing all three.
   */
  conditional?: { if: SchemaNode; then?: SchemaNode; else?: SchemaNode };
  /** `patternProperties`: schemas keyed by the regex they govern, in declaration order. */
  patternProperties?: Array<{ pattern: string; schema: SchemaNode }>;
  /** The schema every property *name* (not value) must satisfy, from `propertyNames`. */
  propertyNames?: SchemaNode;
  /**
   * The schema at least one array item must satisfy, from `contains`. `minContains` and
   * `maxContains` ride along as ordinary constraint chips (see `toConstraints`) since they
   * are scalars that qualify this schema rather than structure of their own.
   */
  contains?: SchemaNode;
  /**
   * `dependentRequired`: a property name mapped to the other properties it requires when
   * present. Kept as an explicit list rather than merged into `required`, since which
   * property triggers which requirement is the point a reader needs to see.
   */
  dependentRequired?: Array<{ property: string; requires: string[] }>;
  /** `dependentSchemas`: a property name mapped to the schema that additionally applies when it is present. */
  dependentSchemas?: Array<{ property: string; schema: SchemaNode }>;
  /** As {@link allowsAdditionalProperties}, but for `unevaluatedProperties`. */
  allowsUnevaluatedProperties?: boolean;
  /** The schema for `unevaluatedProperties`, when it is a schema rather than a boolean. */
  unevaluatedProperties?: SchemaNode;
  /** As {@link allowsAdditionalProperties}, but for `unevaluatedItems`. */
  allowsUnevaluatedItems?: boolean;
  /** The schema for `unevaluatedItems`, when it is a schema rather than a boolean. */
  unevaluatedItems?: SchemaNode;
  /**
   * `x-*` specification extensions found directly on this schema, in declaration order.
   * Values are kept verbatim but rendered modestly — a reader wants to know an extension is
   * present, not a debugging dump of its contents.
   */
  extensions?: Array<{ key: string; value: unknown }>;
  /**
   * `discriminator`: which property in an instance selects a `oneOf`/`anyOf` variant, and
   * optionally how each of that property's values maps to a schema. Kept on the node that
   * declared it — the same node that carries the `oneOf`/`anyOf` in the common case — rather
   * than on {@link Composition}, because the spec itself writes `discriminator` as a sibling
   * of the composition keyword, not nested inside it; modelling it any other way would
   * invent structure the document didn't declare. (It is also legal, if rarer, on a base
   * schema combined via `allOf` rather than directly alongside `oneOf`/`anyOf` — this shape
   * accommodates that too, since it says nothing about where the composition itself lives.)
   */
  discriminator?: Discriminator;
  /**
   * XML serialization hints from the `xml` keyword: element/attribute name, namespace,
   * prefix, whether this node serializes as an attribute rather than an element, whether an
   * array wraps its items in a containing element, and (3.2) `nodeType` for text/cdata/none
   * content. Irrelevant to a JSON-only reader, so kept off the node (`undefined`) unless the
   * document actually declared one.
   */
  xml?: XmlInfo;
}

export interface XmlInfo {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
  /** 3.2 only: `text`, `cdata` or `none`, for a leaf value's XML content model. */
  nodeType?: string;
}

export interface Discriminator {
  propertyName: string;
  /** `mapping` entries, in declaration order. */
  mapping?: DiscriminatorMapping[];
}

export interface DiscriminatorMapping {
  /** The discriminator property's value that selects this variant. */
  value: string;
  /** The mapping target exactly as written — a component name or a `$ref` pointer. */
  target: string;
  /**
   * The component name `target` resolves to, when it is a known schema — either directly
   * (`target` is a bare name) or via a `$ref` pointer. `undefined` when `target` could not
   * be matched to a component, in which case a renderer should show `target` verbatim
   * rather than drop the mapping entry.
   */
  resolvedName?: string;
}

export interface Composition {
  kind: 'oneOf' | 'anyOf' | 'allOf' | 'not';
  options: SchemaNode[];
}

export interface SchemaConstraint {
  label: string;
  value: string;
}

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                      */
/* -------------------------------------------------------------------------- */

export interface Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface License {
  name: string;
  url?: string;
}

export interface ExternalDocs {
  description?: string;
  url: string;
}

export interface ServerInfo {
  /** Display name. For OpenAPI this is the URL; for AsyncAPI, the server key. */
  name: string;
  url: string;
  description?: string;
  /**
   * OpenRPC only: the Server Object's own `summary`, a short label distinct from the
   * longer-form `description`. AsyncAPI's Server Object has no `summary` field, so this is
   * always `undefined` there.
   */
  summary?: string;
  /** AsyncAPI only. */
  protocol?: string;
  /** AsyncAPI 3.0 only: the protocol's own version, e.g. `"3.1.1"` for an MQTT broker. */
  protocolVersion?: string;
  /**
   * AsyncAPI 3.0 only: a path appended to `host` (RFC 6570), for protocols where the server
   * itself has a base path distinct from a channel's own address, e.g. a WebSocket server
   * reachable at `/mqtt` on its host.
   */
  pathname?: string;
  variables?: Array<{
    name: string;
    default?: string;
    description?: string;
    enum?: string[];
  }>;
  /**
   * AsyncAPI only: the security schemes this server accepts. Each entry is an alternative
   * (see {@link SecurityRequirement}) -- AsyncAPI's server `security` is a flat array of
   * scheme references rather than OpenAPI's AND/OR map, so each array entry becomes its own
   * single-scheme alternative.
   */
  security?: SecurityRequirement[];
  /** AsyncAPI only: protocol bindings declared directly on this server. */
  bindings?: BindingInfo[];
  /** AsyncAPI 3.0 only: tag names declared directly on this Server Object. */
  tags?: string[];
  /**
   * `x-*` specification extensions found directly on this Server Object, in declaration
   * order. Same shape and rendering philosophy as {@link SchemaNode.extensions} -- shared by
   * OpenAPI and AsyncAPI, both of which type an `extensions()`/`x-*` accessor on their own
   * Server Object.
   */
  extensions?: Array<{ key: string; value: unknown }>;
}

export interface ExampleValue {
  name: string;
  summary?: string;
  description?: string;
  value: unknown;
  /**
   * A URL holding the example's value, from `externalValue`. Mutually exclusive with
   * `value` per spec, but not enforced here -- if a document somehow wrote both, keeping
   * both is more honest than silently preferring one. Never fetched: apibox renders it as
   * a link, not as the value it points to.
   */
  externalValue?: string;
  /**
   * `x-*` specification extensions found directly on this object, in declaration order.
   * Optional because most callers of this shape (OpenAPI, AsyncAPI media-type examples)
   * predate this field and never set it -- only OpenRPC's `components.examples` catalogue
   * (card 44) populates it.
   */
  extensions?: Array<{ key: string; value: unknown }>;
}

/** One field of a protocol {@link BindingInfo}, in declaration order. */
export interface BindingField {
  key: string;
  value: unknown;
}

/**
 * AsyncAPI protocol binding: protocol-specific detail attached to a server, channel,
 * operation or message -- Kafka topic config, MQTT QoS, an AMQP exchange, and so on.
 *
 * Modelled generically, keyed by protocol name and carrying whatever fields the document
 * wrote, rather than as a typed interface per protocol. AsyncAPI defines dozens of
 * protocols with no shared shape and adds more over time; a hand-modelled union would cover
 * a fixed handful properly and silently drop every protocol not enumerated, including ones
 * that do not exist yet. `@asyncapi/parser` itself already exposes bindings this way -- a
 * `Collection` keyed by protocol, each entry an untyped `value()` -- so this mirrors what
 * the library actually gives us rather than inventing per-protocol structure it doesn't
 * have.
 */
export interface BindingInfo {
  protocol: string;
  /** `bindingVersion`. The library defaults this to `"latest"` when the document omits it, per spec. */
  version?: string;
  fields: BindingField[];
}

export interface TagInfo {
  name: string;
  description?: string;
  externalDocs?: ExternalDocs;
  /**
   * 3.2 nested tags: the name of this tag's parent, and (`kind`) a free-text classification
   * such as `nav` or `badge`. Parsed so the data survives, but `buildNav` still groups
   * operations by their first tag name only, flat -- rebuilding navigation as a tree from
   * `parent` is a larger, separate change than modelling the field itself.
   */
  parent?: string;
  kind?: string;
  /** `x-*` specification extensions found directly on this Tag Object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

/** A single entry in the sidebar. */
export interface NavNode {
  /** Stable anchor id; also the fragment used in deep links. */
  id: string;
  label: string;
  /** Small leading label, e.g. an HTTP method or an AsyncAPI action. */
  badge?: string;
  /** Drives the badge colour. */
  badgeKind?: string;
  deprecated?: boolean;
  children?: NavNode[];
}

export interface ApiDocumentBase {
  /** Slug, unique within a site. Derived from the filename or the title. */
  id: string;
  kind: FormatId;
  title: string;
  version: string;
  /** One-line summary. */
  summary?: string;
  /** Markdown. */
  description?: string;
  contact?: Contact;
  license?: License;
  externalDocs?: ExternalDocs;
  /**
   * A URL to the API's terms of service. Not format-specific -- OpenAPI, AsyncAPI and
   * OpenRPC's `info` objects all carry the same field -- but currently only populated where
   * a parser has been updated to read it.
   */
  termsOfService?: string;
  servers: ServerInfo[];
  tags: TagInfo[];
  nav: NavNode[];
  /** Non-fatal problems found while parsing, surfaced in the UI. */
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* OpenAPI                                                                     */
/* -------------------------------------------------------------------------- */

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie' | 'querystring';

export interface Parameter {
  name: string;
  in: ParameterLocation;
  description?: string;
  required: boolean;
  deprecated?: boolean;
  /**
   * The parameter's schema. Set whether the document declared `schema` directly or a
   * single-media-type `content`, so a renderer showing only a type never comes up empty.
   */
  schema?: SchemaNode;
  /**
   * Set when the parameter was declared with `content` rather than `schema` — OpenAPI
   * permits either, and `content` is how a complex value's media type gets stated.
   */
  content?: MediaTypeBody[];
  examples?: ExampleValue[];
  /**
   * How the parameter is serialized on the wire — `form`, `simple`, `matrix`, `label`,
   * `spaceDelimited`, `pipeDelimited` or `deepObject`. OpenAPI's default depends on `in`
   * (`form` for query/cookie, `simple` for path/header), so this carries the *effective*
   * style whenever the format has such a concept, with `declared` distinguishing a value
   * the document actually wrote from one apibox filled in. Showing only the effective value
   * would let a default look like a document assertion; showing only the declared value
   * would leave most parameters (which rely on the default) looking unspecified when the
   * wire behaviour is well defined. `undefined` for formats with no such concept (AsyncAPI
   * channel parameters), rather than invented.
   */
  style?: { value: string; declared: boolean };
  /**
   * Whether array/object values explode into repeated parameters. Defaults to `true` only
   * when `style` is `form`, `false` otherwise — see {@link style} for why both the effective
   * value and whether the document declared it are kept, and why this is `undefined` where
   * the concept does not apply.
   */
  explode?: { value: boolean; declared: boolean };
  /**
   * `allowReserved` (query only): permits reserved URI characters unencoded. `undefined`
   * unless the document declared it `true` — the default (`false`) changes nothing a reader
   * needs telling about, so it earns no chip.
   */
  allowReserved?: boolean;
  /**
   * `allowEmptyValue` (query only, deprecated by the spec itself): permits an empty-string
   * value. Same declared-only-when-true treatment as {@link allowReserved}.
   */
  allowEmptyValue?: boolean;
}

export interface MediaTypeBody {
  contentType: string;
  schema?: SchemaNode;
  examples?: ExampleValue[];
  /**
   * `encoding`: per-property transfer detail for a multipart or form-urlencoded body, e.g.
   * "the `avatar` property is sent as `image/png`". Without it a multipart upload renders
   * with no indication of each part's content type, which is the whole reason this exists.
   */
  encoding?: MediaTypeEncoding[];
}

export interface MediaTypeEncoding {
  /** The schema property this encoding entry governs. */
  propertyName: string;
  /** The part's content type, when the document declared one explicitly. */
  contentType?: string;
  headers?: ResponseHeader[];
  /**
   * As {@link Parameter.style}: the effective serialization style with whether the document
   * declared it. Only meaningful for `application/x-www-form-urlencoded` bodies, but kept
   * uniformly here rather than conditioned on the sibling media type's content type, matching
   * how {@link Parameter} always carries an effective style regardless of relevance.
   */
  style?: { value: string; declared: boolean };
  /** As {@link Parameter.explode}. */
  explode?: { value: boolean; declared: boolean };
  allowReserved?: boolean;
  /**
   * 3.2: when the encoded property is itself an array, the schema each item must satisfy --
   * distinct from the outer property's own schema, which types the array as a whole.
   */
  itemSchema?: SchemaNode;
  /**
   * 3.2: as {@link itemSchema}, but per-item encoding detail (its own contentType/headers/
   * style/explode) rather than a schema, for the same array-of-encoded-items case. Modelled
   * without `propertyName` -- an item has no property name of its own, only the array
   * property does -- rather than reusing {@link MediaTypeEncoding} wholesale and leaving that
   * field meaninglessly present.
   */
  itemEncoding?: Omit<MediaTypeEncoding, 'propertyName' | 'itemSchema' | 'itemEncoding'>;
}

export interface RequestBodyInfo {
  description?: string;
  required: boolean;
  content: MediaTypeBody[];
}

export interface ResponseHeader {
  name: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  /** As with {@link Parameter}, populated from either `schema` or a lone `content` entry. */
  schema?: SchemaNode;
  content?: MediaTypeBody[];
}

export interface ResponseInfo {
  /** `200`, `4XX`, or `default`. */
  status: string;
  description?: string;
  headers: ResponseHeader[];
  content: MediaTypeBody[];
  /**
   * `links`: how a value in this response can drive a subsequent call, e.g. "use this
   * response's `id` to call `getPetById`". This is the only place OpenAPI documents how
   * operations compose, so dropping it loses the whole story of a multi-step API.
   */
  links?: ResponseLink[];
}

/**
 * OpenAPI's Link Object. Deliberately not shared with OpenRPC's {@link RpcLink} even though
 * both describe a runtime cross-reference from one call's result to another call -- the two
 * spec objects genuinely differ in shape. OpenAPI points at the linked operation by
 * `operationId` *or* a JSON Pointer `operationRef`, and can override the linked call's
 * request body; OpenRPC's Link Object has neither. `parameters` keeps the spec's own field
 * name (OpenRPC calls the equivalent `params`) but the same per-entry shape as
 * {@link RpcLink.params}: each value is kept verbatim since it may be a literal or a runtime
 * expression string such as `$response.body#/id`, which apibox has no way to evaluate.
 */
export interface ResponseLink {
  name: string;
  description?: string;
  /** Direct operation reference, when the document used `operationId`. */
  operationId?: string;
  /** JSON Pointer to an operation (e.g. `#/paths/~1pets~1{id}/get`), when the document used `operationRef` instead. */
  operationRef?: string;
  /**
   * `operationRef` resolved to the operation it points at, when it could be matched to one
   * parsed from this same document -- mirrors {@link DiscriminatorMapping.resolvedName}.
   * `undefined` when `operationRef` was absent, malformed, or pointed outside the document.
   */
  resolvedOperationId?: string;
  /** Param/property name -> literal value or runtime expression, in declaration order. */
  parameters?: Array<{ name: string; value: unknown }>;
  /** A request body to use for the linked call, kept verbatim -- it may itself be a runtime expression. */
  requestBody?: unknown;
  /** Overrides the server the linked call should be made against. */
  server?: ServerInfo;
}

/** A security requirement: any one of the alternatives is sufficient. */
export interface SecurityRequirement {
  alternatives: Array<{ scheme: string; scopes: string[] }>;
}

export interface SecuritySchemeInfo {
  name: string;
  type: string;
  description?: string;
  /** apiKey */
  in?: string;
  paramName?: string;
  /** http */
  httpScheme?: string;
  bearerFormat?: string;
  /** openIdConnect */
  openIdConnectUrl?: string;
  /** oauth2 */
  flows?: Array<{
    kind: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    refreshUrl?: string;
    scopes: Array<{ name: string; description?: string }>;
    /**
     * 3.2: a URL to an OAuth 2.0 Authorization Server Metadata (RFC 8414) document for this
     * flow, letting a client discover endpoints instead of relying on the URLs above alone.
     */
    oauth2MetadataUrl?: string;
  }>;
}

export interface Operation {
  /** Anchor id, unique within the document. */
  id: string;
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  deprecated: boolean;
  tags: string[];
  servers: ServerInfo[];
  externalDocs?: ExternalDocs;
  parameters: Parameter[];
  requestBody?: RequestBodyInfo;
  responses: ResponseInfo[];
  /** Empty array means "explicitly public"; `undefined` means "inherits the document default". */
  security?: SecurityRequirement[];
  /**
   * `callbacks`: requests the API makes *back* to the caller, e.g. a webhook fired when an
   * order ships. Each entry's own {@link Callback.operations} never carries further
   * `callbacks` of its own, even if the document nested one -- there is no legitimate use for
   * a callback-of-a-callback in OpenAPI, and parsing one would recurse without a natural
   * bound. That makes this a fixed two-level structure (operation -> callback -> callback's
   * own operations) by construction, not by depth-counting at parse time.
   */
  callbacks?: Callback[];
  /** `x-*` specification extensions found directly on this Operation Object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

/**
 * One named entry from an operation's `callbacks` map: a runtime expression identifying
 * where the callback request lands (e.g. `{$request.body#/callbackUrl}`), and the Path
 * Item's own operations describing what apibox sends there. Structurally a nested Path Item,
 * so {@link operations} reuses {@link Operation} -- see that field's callbacks note for how
 * the nesting is bounded.
 */
export interface Callback {
  /** The callback's name -- the key in the `callbacks` map. */
  name: string;
  /** The runtime expression key, kept verbatim since apibox cannot evaluate it. */
  expression: string;
  operations: Operation[];
}

export interface OpenApiDocument extends ApiDocumentBase {
  kind: 'openapi';
  specVersion: string;
  operations: Operation[];
  securitySchemes: SecuritySchemeInfo[];
  security?: SecurityRequirement[];
  /** Named component schemas, kept so the Schemas section can list them. */
  schemas: SchemaNode[];
  /**
   * The OpenAPI 3.1 root `jsonSchemaDialect`, recognised the same way `$schema` is for a
   * standalone JSON Schema document (see `jsonSchemaDialect` in `detect.ts`). `undefined`
   * when the document did not declare one or declared a dialect apibox does not recognise.
   */
  jsonSchemaDialect?: string;
  /**
   * OpenAPI 3.2's `$self`: the document's own canonical URI, the same idea as a JSON Schema
   * document's `$id` -- both identify where the document itself claims to live.
   */
  selfUrl?: string;
  /**
   * The OpenAPI 3.1 root `webhooks` map: reusable, always-on Path Items describing requests
   * the API sends unprompted (e.g. "order.shipped"), the mirror image of `paths` -- an
   * inbound request the API receives versus an outbound one it initiates. Each entry reuses
   * {@link Operation}; its `path` holds the webhook's name rather than a URL, since a webhook
   * has no path (see the parser's comment for why that is the least-lossy stand-in).
   * `undefined` when the document declared none, so a request/response-only API's document
   * shows no empty "Webhooks" section.
   */
  webhooks?: Operation[];
  /**
   * `x-*` specification extensions found at the document root or on `info` (OpenAPI has no
   * separate model for `info`, so its extensions land here too), in declaration order.
   */
  extensions?: Array<{ key: string; value: unknown }>;
}

/* -------------------------------------------------------------------------- */
/* AsyncAPI                                                                    */
/* -------------------------------------------------------------------------- */

export interface MessageInfo {
  name: string;
  title?: string;
  summary?: string;
  description?: string;
  contentType?: string;
  payload?: SchemaNode;
  headers?: SchemaNode;
  examples?: ExampleValue[];
  /**
   * Where in a message to find the value correlating it to a request/reply pair, and why.
   * `location` is a runtime expression (e.g. `$message.header#/correlationId`), not a schema
   * path, so it is kept verbatim rather than resolved to a {@link SchemaNode}.
   */
  correlationId?: { location?: string; description?: string };
  /**
   * The payload's declared `schemaFormat`, kept only when it is not JSON Schema (Avro,
   * Protobuf, RAML, ...). When set, {@link payload} is deliberately left `undefined`:
   * walking a non-JSON-Schema payload through the JSON Schema normaliser would misinterpret
   * its keywords (e.g. an Avro `record`'s `fields`) as JSON Schema structure, producing a
   * confidently wrong tree rather than an honestly absent one.
   */
  payloadSchemaFormat?: string;
  /** As {@link payloadSchemaFormat}, but for `headers` -- AsyncAPI allows either to declare its own format. */
  headersSchemaFormat?: string;
  /** Protocol bindings declared on this message. */
  bindings?: BindingInfo[];
  /** Tag names declared directly on this Message Object. */
  tags?: string[];
  externalDocs?: ExternalDocs;
  /** `x-*` specification extensions found directly on this Message Object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

/**
 * AsyncAPI 3.0's request/reply pattern: the operation that publishes the reply, and where in
 * it a caller finds the correlating value.
 */
export interface OperationReplyInfo {
  /** The channel the reply arrives on, when the document names one explicitly. */
  channelAddress?: string;
  /** Runtime pointer (e.g. `$message.header#/correlationId`) identifying the correlating value. */
  addressLocation?: string;
  addressDescription?: string;
  messages: MessageInfo[];
}

export interface ChannelOperation {
  id: string;
  /** `send` or `receive` in AsyncAPI 3; `publish`/`subscribe` are mapped onto these. */
  action: 'send' | 'receive';
  channelAddress: string;
  channelTitle?: string;
  summary?: string;
  description?: string;
  parameters: Parameter[];
  messages: MessageInfo[];
  /** Operation-level security, mirroring OpenAPI's per-operation `security`. */
  security?: SecurityRequirement[];
  /** Operation-level tag names. */
  tags?: string[];
  /** Server names this channel is restricted to, when the document narrows it. */
  channelServers?: string[];
  reply?: OperationReplyInfo;
  /** Protocol bindings declared on the operation itself. */
  bindings?: BindingInfo[];
  /** Protocol bindings declared on the operation's channel. */
  channelBindings?: BindingInfo[];
  /**
   * Tag names declared directly on the channel's Channel Object -- distinct from {@link tags},
   * which are the operation's own. AsyncAPI 3.0 only: `ChannelInterface` does not type this
   * accessor (see {@link ChannelInfo.tags}'s doc comment for why it is read anyway), and 2.x
   * channels have no such concept at all.
   */
  channelTags?: string[];
  /** As {@link channelTags}, the channel's own `externalDocs` rather than the operation's. */
  channelExternalDocs?: ExternalDocs;
  /** `x-*` specification extensions found directly on the Operation Object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
  /** As {@link extensions}, but the channel's own -- mirrors {@link channelBindings}/{@link channelServers}. */
  channelExtensions?: Array<{ key: string; value: unknown }>;
}

/**
 * A channel with no operation referencing it. `operations` above is built by iterating
 * operations (each carrying its channel's address/title inline), which is silent about a
 * channel declared for documentation ahead of any publish/subscribe being wired to it --
 * this list is where such channels survive.
 */
export interface ChannelInfo {
  id: string;
  address: string;
  title?: string;
  description?: string;
  parameters: Parameter[];
  servers?: string[];
  /** Protocol bindings declared on this channel. */
  bindings?: BindingInfo[];
  /**
   * AsyncAPI 3.0 only: tag names declared directly on this Channel Object.
   *
   * `ChannelInterface`'s typed extends list omits `TagsMixinInterface` (unlike
   * `externalDocs`'s own mixin -- see {@link externalDocs} -- both are still missing), even
   * though the concrete 3.x `Channel` class answers `tags()` at runtime via `CoreModel`
   * (`@asyncapi/parser`'s `cjs/models/v3/mixins.js`). Read the same way `title` already is
   * (see `readTitle` in the AsyncAPI parser), guarded by `typeof === 'function'` so a 2.x
   * channel -- which has neither concept -- yields `undefined` rather than throwing.
   */
  tags?: string[];
  /** As {@link tags}: read past the typed model the same way, for the same reason. */
  externalDocs?: ExternalDocs;
  /** `x-*` specification extensions found directly on this Channel Object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

export interface AsyncApiDocument extends ApiDocumentBase {
  kind: 'asyncapi';
  specVersion: string;
  operations: ChannelOperation[];
  schemas: SchemaNode[];
  securitySchemes: SecuritySchemeInfo[];
  /** `defaultContentType`: the content type messages fall back to when they declare none. */
  defaultContentType?: string;
  orphanChannels: ChannelInfo[];
  /**
   * AsyncAPI 3.0's root `id`: the application's own URI, e.g. `urn:example:com:streetlights`.
   * Named `applicationId` rather than `id` -- {@link ApiDocumentBase.id} is already taken by
   * apibox's own internal slug, which is a wholly different thing from this spec field.
   */
  applicationId?: string;
  /**
   * `x-*` specification extensions found at the document root or on `info` (AsyncAPI has
   * separate root and `info` objects, unlike OpenAPI, but both are folded into one list here
   * the same way OpenAPI folds its own root+info extensions -- a reader does not need to know
   * which of the two objects an extension happened to be attached to).
   */
  extensions?: Array<{ key: string; value: unknown }>;
}

/* -------------------------------------------------------------------------- */
/* JSON-RPC / OpenRPC                                                          */
/* -------------------------------------------------------------------------- */

export interface RpcParam {
  name: string;
  /** The ContentDescriptor Object's own short label, distinct from `description`. */
  summary?: string;
  description?: string;
  required: boolean;
  deprecated?: boolean;
  schema?: SchemaNode;
  /** `x-*` specification extensions found directly on this object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

export interface RpcError {
  code: number;
  message: string;
  description?: string;
  schema?: SchemaNode;
  /** `x-*` specification extensions found directly on this object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

export interface RpcExample {
  name: string;
  /** The ExamplePairing Object's own short label, distinct from `description`. */
  summary?: string;
  description?: string;
  params: unknown;
  /** Absent when the example carries `resultExternalValue` instead. */
  result?: unknown;
  /**
   * The result Example Object's `externalValue`, when it carries a URL instead of an
   * inline `value`. Mirrors `ExampleValue.externalValue` (OpenAPI) -- mutually exclusive
   * with `result`, rendered as a link, never fetched. Params keep the request-shape
   * collapse (see `parseExamples`), so an externalValue on a param is surfaced inline as
   * a string placeholder there rather than as a second field per param.
   */
  resultExternalValue?: string;
  /** `x-*` specification extensions found directly on this object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

/**
 * OpenRPC's Link Object: a runtime-determined cross-reference from one method's result to
 * another method call, e.g. "call `getBlock` using this result's `hash`". `params` values
 * are kept verbatim -- the spec permits either a literal value or a runtime expression
 * string (`$response.result#/...`), and apibox has no way to evaluate either, so both are
 * shown as the reader would need to interpret them by hand.
 */
export interface RpcLink {
  name: string;
  description?: string;
  summary?: string;
  /** Name of the method this link points to. */
  method?: string;
  /** Param name -> literal value or runtime expression, in declaration order. */
  params?: Array<{ name: string; value: unknown }>;
  /** Overrides the server a linked call should be made against. */
  server?: ServerInfo;
  /** `x-*` specification extensions found directly on this object, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

export interface RpcMethod {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  deprecated: boolean;
  tags: string[];
  /** `by-name` when the method takes named params, `by-position` for an array. */
  paramStructure: 'by-name' | 'by-position' | 'either';
  params: RpcParam[];
  result?: {
    name: string;
    /** The result ContentDescriptor's own short label, distinct from `description`. */
    summary?: string;
    description?: string;
    schema?: SchemaNode;
    deprecated?: boolean;
  };
  errors: RpcError[];
  examples: RpcExample[];
  links: RpcLink[];
  /** Per-method server override, when the document narrows it away from the document default. */
  servers?: ServerInfo[];
  externalDocs?: ExternalDocs;
  /**
   * `x-*` specification extensions found directly on this Method Object, in declaration
   * order. Same shape and rendering philosophy as {@link SchemaNode.extensions}.
   */
  extensions?: Array<{ key: string; value: unknown }>;
}

export interface JsonRpcDocument extends ApiDocumentBase {
  kind: 'jsonrpc';
  specVersion: string;
  methods: RpcMethod[];
  schemas: SchemaNode[];
  /**
   * Named entries under `components.contentDescriptors`, browsable independent of which
   * methods reference them -- the same "shared building block" value `schemas` already has.
   */
  contentDescriptors: RpcParam[];
  /**
   * Named entries under `components.tags`, independent of whether any method references
   * them -- unlike {@link ApiDocumentBase.tags}, which only lists tags a method actually
   * used, in the order first encountered. A tag declared here but referenced by nothing is
   * exactly the "orphan" a reader cannot otherwise discover: it is still part of the
   * document's declared contract, so it gets its own catalogue rather than silently
   * dropping out because no method happened to point at it.
   */
  tagCatalog: TagInfo[];
  /**
   * Named entries under `components.examples` -- the Example Object bucket (a name, a
   * value or `externalValue`), not to be confused with {@link RpcMethod.examples} or
   * `components.examplePairings` below, both of which are the *pairing* shape (params +
   * result). OpenRPC genuinely has both bucket shapes; this is the plainer of the two.
   */
  exampleCatalog: ExampleValue[];
  /**
   * Named entries under `components.examplePairings`, reusing {@link RpcExample} -- the
   * same params/result pairing shape a method's own `examples` already uses, since that is
   * exactly what an ExamplePairing Object is.
   */
  examplePairingCatalog: RpcExample[];
  /**
   * Named entries under `components.links`, reusing {@link RpcLink} -- the same shape a
   * method's own `links` already uses. Shown independent of any specific method's result,
   * unlike a method's own links list, so its `method` field (rather than any inferred
   * source) is what tells a reader where a catalogued link actually goes.
   */
  linkCatalog: RpcLink[];
  /** `x-*` specification extensions found at the document root, in declaration order. */
  extensions?: Array<{ key: string; value: unknown }>;
}

/* -------------------------------------------------------------------------- */
/* JSON Schema                                                                 */
/* -------------------------------------------------------------------------- */

export interface JsonSchemaDocument extends ApiDocumentBase {
  kind: 'jsonschema';
  /**
   * The dialect the document declared via `$schema`, e.g. `2020-12` or `draft-07`.
   * Detection requires `$schema` to be present (see `detect.ts`), so this is always a
   * genuine document-declared version rather than a guess.
   */
  specVersion: string;
  /** The root schema's `$id` (or draft-04 `id`), when declared. */
  schemaId?: string;
  /** The document's own root schema, when it described one directly. */
  root?: SchemaNode;
  /** Named entries from `$defs` (2019-09+) or `definitions` (draft-07 and earlier). */
  schemas: SchemaNode[];
  /**
   * `$vocabulary`: which keyword vocabularies the document's meta-schema requires (`true`)
   * or merely permits (`false`), by URI, in declaration order. Meaningful only at a schema
   * resource's own root, unlike most JSON Schema keywords -- so it is read here, off the
   * document root, rather than modelled on `SchemaNode` where `walk()` could pick it up on
   * an unrelated nested schema that never declared one. `undefined` when the document
   * declared none, the overwhelmingly common case, so a document with no opinion on
   * vocabularies renders exactly as it did before this was parsed.
   */
  vocabulary?: Array<{ uri: string; mandatory: boolean }>;
}

export type ApiDocument = OpenApiDocument | AsyncApiDocument | JsonRpcDocument | JsonSchemaDocument;

/* -------------------------------------------------------------------------- */
/* Site manifest                                                               */
/* -------------------------------------------------------------------------- */

/** Written to `data/manifest.json`; the shell reads it before any document. */
export interface Manifest {
  /** Manifest schema version, so an old site and a new shell can detect a mismatch. */
  schemaVersion: 1;
  title: string;
  description?: string;
  generatedAt: string;
  generator: string;
  documents: ManifestEntry[];
}

export interface ManifestEntry {
  id: string;
  kind: FormatId;
  title: string;
  version: string;
  summary?: string;
  /** Path to the document JSON, relative to the manifest. */
  path: string;
}
