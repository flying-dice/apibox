/**
 * The normalised document model.
 *
 * Every supported specification format is parsed down to one of the `ApiDocument`
 * variants below. The renderers in `@apibox/ui` only ever see this model — they never
 * touch a raw OpenAPI or AsyncAPI object. That boundary is what lets a fourth format be
 * added later without reopening the UI.
 */

export type FormatId = 'openapi' | 'asyncapi' | 'jsonrpc';

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
  /** AsyncAPI only. */
  protocol?: string;
  variables?: Array<{
    name: string;
    default?: string;
    description?: string;
    enum?: string[];
  }>;
}

export interface ExampleValue {
  name: string;
  summary?: string;
  description?: string;
  value: unknown;
}

export interface TagInfo {
  name: string;
  description?: string;
  externalDocs?: ExternalDocs;
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
  servers: ServerInfo[];
  tags: TagInfo[];
  nav: NavNode[];
  /** Non-fatal problems found while parsing, surfaced in the UI. */
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* OpenAPI                                                                     */
/* -------------------------------------------------------------------------- */

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';

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
}

export interface MediaTypeBody {
  contentType: string;
  schema?: SchemaNode;
  examples?: ExampleValue[];
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
}

export interface OpenApiDocument extends ApiDocumentBase {
  kind: 'openapi';
  specVersion: string;
  operations: Operation[];
  securitySchemes: SecuritySchemeInfo[];
  security?: SecurityRequirement[];
  /** Named component schemas, kept so the Schemas section can list them. */
  schemas: SchemaNode[];
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
}

export interface AsyncApiDocument extends ApiDocumentBase {
  kind: 'asyncapi';
  specVersion: string;
  operations: ChannelOperation[];
  schemas: SchemaNode[];
}

/* -------------------------------------------------------------------------- */
/* JSON-RPC / OpenRPC                                                          */
/* -------------------------------------------------------------------------- */

export interface RpcParam {
  name: string;
  description?: string;
  required: boolean;
  deprecated?: boolean;
  schema?: SchemaNode;
}

export interface RpcError {
  code: number;
  message: string;
  description?: string;
  schema?: SchemaNode;
}

export interface RpcExample {
  name: string;
  description?: string;
  params: unknown;
  result: unknown;
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
  result?: { name: string; description?: string; schema?: SchemaNode };
  errors: RpcError[];
  examples: RpcExample[];
}

export interface JsonRpcDocument extends ApiDocumentBase {
  kind: 'jsonrpc';
  specVersion: string;
  methods: RpcMethod[];
  schemas: SchemaNode[];
}

export type ApiDocument = OpenApiDocument | AsyncApiDocument | JsonRpcDocument;

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
