import { jsonSchemaDialect, UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  Callback,
  ExampleValue,
  MediaTypeBody,
  MediaTypeEncoding,
  NavNode,
  OpenApiDocument,
  Operation,
  Parameter,
  ParameterLocation,
  RequestBodyInfo,
  ResponseHeader,
  ResponseInfo,
  ResponseLink,
  SchemaNode,
  SecurityRequirement,
  SecuritySchemeInfo,
  ServerInfo,
  TagInfo,
} from '../../types.js';
import { asArray, asRecord, asString, slugify, uniqueId } from '../../utils.js';
import {
  collectComponentNames,
  dereferenceDocument,
  isExtensionKey,
  parseComponentSchemas,
  parseContact,
  parseExternalDocs,
  parseLicense,
  schemaNavigation,
} from '../shared.js';

/** HTTP methods, in the order they should appear under a path. */
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

export interface ParseOpenApiOptions {
  /** Document id. Defaults to a slug of the title. */
  id?: string;
  /** Base path or URL used to resolve external `$ref`s. */
  location?: string;
}

export async function parseOpenApi(
  raw: unknown,
  options: ParseOpenApiOptions = {},
): Promise<OpenApiDocument> {
  const root = asRecord(raw);
  if (!root) throw new UnsupportedDocumentError('Document is not an object.');

  if (asString(root.swagger)) {
    throw new UnsupportedDocumentError(
      'Swagger 2.0 documents are not supported yet. Convert the document to OpenAPI 3.x ' +
        'first — for example with `bunx swagger2openapi` — and open the result.',
    );
  }

  const specVersion = asString(root.openapi) ?? '3.0.0';
  // OpenAPI 3.1 only: the root may declare a dialect other than the implicit OpenAPI base
  // dialect for the JSON Schemas it embeds. Read with the same recogniser a standalone JSON
  // Schema document's `$schema` uses, so the two report the dialect the same way.
  const declaredDialect = jsonSchemaDialect(asString(root.jsonSchemaDialect));
  const warnings: string[] = [];

  // OpenAPI 3.1+ allows a $ref to carry its own summary/description override. No special
  // handling is needed here for that: $RefParser (dereferenceDocument's underlying library)
  // already treats a $ref with sibling keys as an "extended reference" and merges the
  // sibling(s) into a fresh copy of the target rather than discarding them -- see the
  // reference-level override tests in parse.test.ts for what this produces.
  const dereferenced = await dereferenceDocument(root, options.location, warnings);
  const names = collectComponentNames(dereferenced);

  const info = asRecord(dereferenced.info) ?? {};
  const title = asString(info.title) ?? 'Untitled API';
  const version = asString(info.version) ?? '0.0.0';

  const tags = parseTags(dereferenced.tags);
  const servers = parseServers(dereferenced.servers);
  const securitySchemes = parseSecuritySchemes(dereferenced);
  // Shared across `paths` and `webhooks` so an id collision between the two (e.g. a webhook
  // named the same as a path's slug) is still deduplicated document-wide.
  const taken = new Set<string>();
  const operations = parseOperations(dereferenced, names, servers, warnings, taken);
  const webhooks = parseWebhooks(dereferenced, names, servers, warnings, taken);
  const schemas = parseComponentSchemas(dereferenced, names);
  // Root-level extensions first, then info-level -- OpenAPI has no separate model for
  // `info` here (its fields are flattened onto the document directly), so its extensions
  // are folded into the same list rather than invented a second field for.
  const documentExtensions = [
    ...(parseExtensions(dereferenced) ?? []),
    ...(parseExtensions(info) ?? []),
  ];

  return {
    id: options.id ?? slugify(title),
    kind: 'openapi',
    specVersion,
    title,
    version,
    summary: asString(info.summary),
    description: asString(info.description),
    contact: parseContact(info.contact),
    license: parseLicense(info.license),
    externalDocs: parseExternalDocs(dereferenced.externalDocs),
    servers,
    tags,
    securitySchemes,
    security: parseSecurity(dereferenced.security),
    operations,
    schemas,
    jsonSchemaDialect: declaredDialect,
    // 3.2: the document's own canonical URI, the same idea as a JSON Schema `$id`.
    selfUrl: asString(dereferenced.$self),
    nav: buildNav(operations, tags, schemas, webhooks),
    warnings,
    webhooks: webhooks.length > 0 ? webhooks : undefined,
    extensions: documentExtensions.length > 0 ? documentExtensions : undefined,
  };
}

/** `x-*` specification extensions found directly on `record`, in declaration order. */
function parseExtensions(
  record: Record<string, unknown>,
): Array<{ key: string; value: unknown }> | undefined {
  const entries = Object.entries(record).filter(([key]) => isExtensionKey(key));
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : undefined;
}

/* -------------------------------------------------------------------------- */

function parseTags(raw: unknown): TagInfo[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && asString(entry.name)))
    .map((entry) => ({
      name: asString(entry.name) as string,
      description: asString(entry.description),
      externalDocs: parseExternalDocs(entry.externalDocs),
      // 3.2 nested tags -- see TagInfo.parent's doc comment for why navigation stays flat.
      parent: asString(entry.parent),
      kind: asString(entry.kind),
      extensions: parseExtensions(entry),
    }));
}

function parseServers(raw: unknown): ServerInfo[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => {
      const url = asString(entry.url) ?? '/';
      const variables = asRecord(entry.variables);
      return {
        name: url,
        url,
        description: asString(entry.description),
        variables: variables
          ? Object.entries(variables).map(([name, value]) => {
              const v = asRecord(value) ?? {};
              return {
                name,
                default: asString(v.default),
                description: asString(v.description),
                enum: asArray(v.enum).filter((e): e is string => typeof e === 'string'),
              };
            })
          : undefined,
        extensions: parseExtensions(entry),
      } satisfies ServerInfo;
    });
}

function parseSecurity(raw: unknown): SecurityRequirement[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      alternatives: Object.entries(record).map(([scheme, scopes]) => ({
        scheme,
        scopes: asArray(scopes).filter((s): s is string => typeof s === 'string'),
      })),
    };
  });
}

function parseSecuritySchemes(root: Record<string, unknown>): SecuritySchemeInfo[] {
  const schemes = asRecord(asRecord(root.components)?.securitySchemes);
  if (!schemes) return [];
  return Object.entries(schemes).map(([name, value]) => {
    const scheme = asRecord(value) ?? {};
    const flowsRecord = asRecord(scheme.flows);
    return {
      name,
      type: asString(scheme.type) ?? 'unknown',
      description: asString(scheme.description),
      in: asString(scheme.in),
      paramName: asString(scheme.name),
      httpScheme: asString(scheme.scheme),
      bearerFormat: asString(scheme.bearerFormat),
      openIdConnectUrl: asString(scheme.openIdConnectUrl),
      flows: flowsRecord
        ? Object.entries(flowsRecord).map(([kind, flowValue]) => {
            const flow = asRecord(flowValue) ?? {};
            const scopes = asRecord(flow.scopes) ?? {};
            return {
              kind,
              authorizationUrl: asString(flow.authorizationUrl),
              tokenUrl: asString(flow.tokenUrl),
              refreshUrl: asString(flow.refreshUrl),
              scopes: Object.entries(scopes).map(([scopeName, description]) => ({
                name: scopeName,
                description: asString(description),
              })),
              // 3.2: an RFC 8414 Authorization Server Metadata URL for this flow.
              oauth2MetadataUrl: asString(flow.oauth2Metadata),
            };
          })
        : undefined,
    } satisfies SecuritySchemeInfo;
  });
}

/* -------------------------------------------------------------------------- */

function parseOperations(
  root: Record<string, unknown>,
  names: Map<object, string>,
  documentServers: ServerInfo[],
  warnings: string[],
  taken: Set<string>,
): Operation[] {
  const paths = asRecord(root.paths);
  if (!paths) {
    warnings.push('The document declares no paths.');
    return [];
  }

  const operations: Operation[] = [];

  for (const [path, pathValue] of Object.entries(paths)) {
    const pathItem = asRecord(pathValue);
    if (!pathItem) continue;
    operations.push(
      ...parsePathItemOperations(pathItem, names, documentServers, warnings, path, taken, {
        parseCallbacks: true,
      }),
    );
  }

  // Second pass: an operationRef can point at any operation in the document, including one
  // parsed after the link that names it, so resolution has to wait until every operation
  // (top-level and callback) has an id to match against.
  resolveLinkOperationRefs(operations);

  return operations;
}

/**
 * Parse the OpenAPI 3.1 root `webhooks` map: reusable, always-on Path Items describing
 * requests the API sends unprompted (e.g. "a payment was captured"), the mirror image of
 * `paths` -- an outbound request the API initiates rather than an inbound one it serves.
 * Reuses {@link parsePathItemOperations} since a webhook's Path Item has the identical
 * shape; only the key differs, a name rather than a URL.
 */
function parseWebhooks(
  root: Record<string, unknown>,
  names: Map<object, string>,
  documentServers: ServerInfo[],
  warnings: string[],
  taken: Set<string>,
): Operation[] {
  const webhooksRecord = asRecord(root.webhooks);
  if (!webhooksRecord) return [];

  const operations: Operation[] = [];
  for (const [name, pathItemValue] of Object.entries(webhooksRecord)) {
    if (isExtensionKey(name)) continue;
    const pathItem = asRecord(pathItemValue);
    if (!pathItem) continue;
    operations.push(
      // A webhook has no URL, so `path` has no meaning for it -- the same situation a
      // callback's runtime expression is in (see parseCallbacks below). The webhook's own
      // name stands in instead, which is also the identity a reader already has for it.
      ...parsePathItemOperations(pathItem, names, documentServers, warnings, name, taken, {
        parseCallbacks: true,
      }),
    );
  }

  // Deliberately not fed through resolveLinkOperationRefs: that function's pointer format
  // (`#/paths/{path}/{method}`) does not describe a webhook (which would need `#/webhooks/
  // {name}/{method}`), and building both formats for one shared pointer map risks a false
  // match if a webhook name happens to equal a path. A link inside a webhook that points at
  // another webhook by operationRef is not resolved -- a narrower gap than not having
  // webhooks at all, and one this card's brief did not ask to close.
  return operations;
}

interface ParsePathItemOptions {
  /**
   * Whether to read this Path Item's operations' own `callbacks`. `false` for a callback's
   * Path Item -- see {@link Operation.callbacks} for why callbacks never nest.
   */
  parseCallbacks: boolean;
}

/**
 * Parse one Path Item's operations (its `get`, `post`, ... entries). Shared between top-level
 * `paths` entries and the Path Items nested inside a `callbacks` map, which have the same
 * shape apart from being keyed by a runtime expression instead of a URL path.
 */
function parsePathItemOperations(
  pathItem: Record<string, unknown>,
  names: Map<object, string>,
  documentServers: ServerInfo[],
  warnings: string[],
  path: string,
  taken: Set<string>,
  options: ParsePathItemOptions,
): Operation[] {
  // Path-level parameters apply to every operation under the path, unless an operation
  // declares one with the same name and location.
  const sharedParameters = parseParameters(pathItem.parameters, names);
  const pathServers = parseServers(pathItem.servers);

  const operations: Operation[] = [];

  const buildOperation = (method: string, operationValue: Record<string, unknown>): Operation => {
    const operationId = asString(operationValue.operationId);
    const id = uniqueId(slugify(operationId ?? `${method}-${path}`), taken);
    const ownParameters = parseParameters(operationValue.parameters, names);
    const ownServers = parseServers(operationValue.servers);

    return {
      id,
      method: method.toUpperCase(),
      path,
      operationId,
      summary: asString(operationValue.summary),
      description: asString(operationValue.description),
      deprecated: operationValue.deprecated === true,
      tags: asArray(operationValue.tags).filter((t): t is string => typeof t === 'string'),
      servers:
        ownServers.length > 0 ? ownServers : pathServers.length > 0 ? pathServers : documentServers,
      externalDocs: parseExternalDocs(operationValue.externalDocs),
      parameters: mergeParameters(sharedParameters, ownParameters),
      requestBody: parseRequestBody(operationValue.requestBody, names),
      responses: parseResponses(operationValue.responses, names),
      security: parseSecurity(operationValue.security),
      callbacks: options.parseCallbacks
        ? parseCallbacks(operationValue.callbacks, names, warnings, taken)
        : undefined,
      extensions: parseExtensions(operationValue),
    };
  };

  for (const method of METHODS) {
    const operationValue = asRecord(pathItem[method]);
    if (!operationValue) continue;
    operations.push(buildOperation(method, operationValue));
  }

  // 3.2's `additionalOperations`: arbitrary HTTP methods (e.g. `QUERY`) beyond the 8 fixed
  // verbs above, keyed by method name rather than a dedicated Path Item field per method.
  const additionalOperations = asRecord(pathItem.additionalOperations);
  if (additionalOperations) {
    for (const [method, value] of Object.entries(additionalOperations)) {
      if (isExtensionKey(method)) continue;
      const operationValue = asRecord(value);
      if (!operationValue) continue;
      operations.push(buildOperation(method, operationValue));
    }
  }

  return operations;
}

function parseCallbacks(
  raw: unknown,
  names: Map<object, string>,
  warnings: string[],
  taken: Set<string>,
): Callback[] | undefined {
  const callbacksRecord = asRecord(raw);
  if (!callbacksRecord) return undefined;

  const out: Callback[] = [];
  for (const [callbackName, callbackValue] of Object.entries(callbacksRecord)) {
    if (isExtensionKey(callbackName)) continue;
    const expressions = asRecord(callbackValue);
    if (!expressions) continue;

    for (const [expression, pathItemValue] of Object.entries(expressions)) {
      if (isExtensionKey(expression)) continue;
      const pathItem = asRecord(pathItemValue);
      if (!pathItem) continue;

      out.push({
        name: callbackName,
        expression,
        // `path` has no meaning for a callback -- there is no URL, only the runtime
        // expression -- so the expression itself stands in for it, the same value a reader
        // already sees on the callback entry.
        operations: parsePathItemOperations(pathItem, names, [], warnings, expression, taken, {
          parseCallbacks: false,
        }),
      });
    }
  }

  return out.length > 0 ? out : undefined;
}

/** Escape a path segment for use inside a JSON Pointer (`~` -> `~0`, `/` -> `~1`). */
function jsonPointerEscape(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Resolve each response link's `operationRef` to the operation it points at, when that
 * operation exists in this same document. `operationRef` is a JSON Pointer such as
 * `#/paths/~1pets~1{id}/get`, possibly prefixed with a document URL that dereferencing has
 * already stripped meaning from -- only the `#/...` fragment is matched.
 */
function resolveLinkOperationRefs(operations: Operation[]): void {
  const byPointer = new Map<string, string>();
  for (const operation of operations) {
    if (!operation.operationId) continue;
    const pointer = `#/paths/${jsonPointerEscape(operation.path)}/${operation.method.toLowerCase()}`;
    byPointer.set(pointer, operation.operationId);
  }

  for (const operation of operations) {
    for (const response of operation.responses) {
      for (const link of response.links ?? []) {
        if (!link.operationRef) continue;
        const hashIndex = link.operationRef.indexOf('#');
        const fragment = hashIndex >= 0 ? link.operationRef.slice(hashIndex) : link.operationRef;
        link.resolvedOperationId = byPointer.get(fragment);
      }
    }
  }
}

/** Operation parameters override path parameters that share a name and location. */
function mergeParameters(shared: Parameter[], own: Parameter[]): Parameter[] {
  const overridden = new Set(own.map((p) => `${p.in}:${p.name}`));
  return [...shared.filter((p) => !overridden.has(`${p.in}:${p.name}`)), ...own];
}

// `querystring` (3.2) last: it describes the whole raw query string as one value, which is
// rare enough, and different enough in kind from the other locations, that ordering it with
// the common ones would suggest a false equivalence.
const PARAM_ORDER: ParameterLocation[] = ['path', 'query', 'header', 'cookie', 'querystring'];

/**
 * OpenAPI's default `style` per parameter location — `form` for query and cookie, `simple`
 * for path and header. Applied only when the document did not declare `style` itself, so
 * the effective value is always known even though most parameters never mention it.
 */
function defaultStyle(location: ParameterLocation): string {
  return location === 'query' || location === 'cookie' ? 'form' : 'simple';
}

/** `explode` defaults to `true` only when the (effective) style is `form`, `false` otherwise. */
function defaultExplode(style: string): boolean {
  return style === 'form';
}

function parseParameters(raw: unknown, names: Map<object, string>): Parameter[] {
  const parsed = asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && asString(entry.name)))
    .map((entry) => {
      const location = (asString(entry.in) ?? 'query') as ParameterLocation;
      const { schema, content } = parseSchemaOrContent(entry, names);

      const declaredStyle = asString(entry.style);
      const style = declaredStyle ?? defaultStyle(location);
      const declaredExplode = typeof entry.explode === 'boolean' ? entry.explode : undefined;
      const explode = declaredExplode ?? defaultExplode(style);

      return {
        name: asString(entry.name) as string,
        in: location,
        description: asString(entry.description),
        // Path parameters are required by definition, whatever the document says.
        required: entry.required === true || location === 'path',
        deprecated: entry.deprecated === true,
        schema,
        content,
        examples: parseExamples(entry),
        style: { value: style, declared: declaredStyle !== undefined },
        explode: { value: explode, declared: declaredExplode !== undefined },
        // `false` is the default for both and changes nothing a reader needs telling about —
        // only a `true` declaration is worth a chip.
        allowReserved: entry.allowReserved === true ? true : undefined,
        allowEmptyValue: entry.allowEmptyValue === true ? true : undefined,
      } satisfies Parameter;
    });

  // Path, then query, then header, then cookie: the order a reader builds a request in.
  return parsed.sort((a, b) => PARAM_ORDER.indexOf(a.in) - PARAM_ORDER.indexOf(b.in));
}

function parseRequestBody(raw: unknown, names: Map<object, string>): RequestBodyInfo | undefined {
  const body = asRecord(raw);
  if (!body) return undefined;
  return {
    description: asString(body.description),
    required: body.required === true,
    content: parseContent(body.content, names),
  };
}

function parseResponses(raw: unknown, names: Map<object, string>): ResponseInfo[] {
  const responses = asRecord(raw);
  if (!responses) return [];
  return Object.entries(responses)
    .filter(([status]) => !isExtensionKey(status))
    .map(([status, value]) => {
      const response = asRecord(value) ?? {};
      const headers = asRecord(response.headers);
      return {
        status,
        description: asString(response.description),
        headers: headers
          ? Object.entries(headers).map(([name, headerValue]) => {
              const header = asRecord(headerValue) ?? {};
              const { schema, content } = parseSchemaOrContent(header, names);
              return {
                name,
                description: asString(header.description),
                required: header.required === true,
                deprecated: header.deprecated === true,
                schema,
                content,
              } satisfies ResponseHeader;
            })
          : [],
        content: parseContent(response.content, names),
        links: parseLinks(response.links),
      } satisfies ResponseInfo;
    })
    .sort(compareStatus);
}

/**
 * Parse a response's `links` map. `resolvedOperationId` for `operationRef` entries is filled
 * in later, by {@link resolveLinkOperationRefs}, once every operation in the document has an
 * id to match against.
 */
function parseLinks(raw: unknown): ResponseLink[] | undefined {
  const links = asRecord(raw);
  if (!links) return undefined;

  const out = Object.entries(links)
    .filter(([name]) => !isExtensionKey(name))
    .map(([name, value]) => {
      const link = asRecord(value) ?? {};
      const parameters = asRecord(link.parameters);
      const server = asRecord(link.server);
      return {
        name,
        description: asString(link.description),
        operationId: asString(link.operationId),
        operationRef: asString(link.operationRef),
        parameters:
          parameters && Object.keys(parameters).length > 0
            ? Object.entries(parameters).map(([paramName, paramValue]) => ({
                name: paramName,
                value: paramValue,
              }))
            : undefined,
        requestBody: 'requestBody' in link ? link.requestBody : undefined,
        server: server ? parseServers([server])[0] : undefined,
      } satisfies ResponseLink;
    });

  return out.length > 0 ? out : undefined;
}

/** Numeric codes ascending, with `default` last. */
function compareStatus(a: ResponseInfo, b: ResponseInfo): number {
  const rank = (status: string) =>
    status === 'default'
      ? Number.MAX_SAFE_INTEGER
      : Number.parseInt(status.replace(/X/gi, '0'), 10) || 0;
  return rank(a.status) - rank(b.status);
}

/**
 * Read a parameter's or header's schema.
 *
 * OpenAPI allows either `schema` or `content` here, and `content` is not a rarity — it is
 * the prescribed way to describe a parameter whose value is, say, a JSON object. Reading
 * only `schema` silently renders such parameters as untyped.
 *
 * `schema` is populated from a lone media type as well, so a renderer that only knows about
 * `schema` still shows a type; `content` carries the media type for one that shows more.
 */
function parseSchemaOrContent(
  holder: Record<string, unknown>,
  names: Map<object, string>,
): { schema?: SchemaNode; content?: MediaTypeBody[] } {
  if (holder.schema !== undefined) {
    return { schema: normaliseSchema(holder.schema, { names }) };
  }
  const content = parseContent(holder.content, names);
  if (content.length === 0) return {};
  return { schema: content.length === 1 ? content[0]?.schema : undefined, content };
}

function parseContent(raw: unknown, names: Map<object, string>): MediaTypeBody[] {
  const content = asRecord(raw);
  if (!content) return [];
  return Object.entries(content).map(([contentType, value]) => {
    const media = asRecord(value) ?? {};
    return {
      contentType,
      schema: normaliseSchema(media.schema, { names }),
      examples: parseExamples(media),
      encoding: parseEncoding(media.encoding, names),
    } satisfies MediaTypeBody;
  });
}

/**
 * Parse a multipart/form-urlencoded media type's `encoding` map -- per-property transfer
 * detail such as "the `avatar` property is sent as `image/png`", otherwise silently dropped.
 * `style`/`explode` reuse {@link Parameter}'s value/declared shape (see {@link defaultStyle}
 * and {@link defaultExplode}) even though the "location" those helpers are named for doesn't
 * apply here -- `form` is `encoding`'s only meaningful default, so it is passed directly.
 */
function parseEncoding(raw: unknown, names: Map<object, string>): MediaTypeEncoding[] | undefined {
  const encoding = asRecord(raw);
  if (!encoding) return undefined;

  const out = Object.entries(encoding).map(([propertyName, value]) => ({
    propertyName,
    ...parseEncodingDetail(asRecord(value) ?? {}, names),
  }));

  return out.length > 0 ? out : undefined;
}

/**
 * The fields an Encoding Object carries beyond its map key -- shared between a top-level
 * `encoding` entry (keyed by property name) and its 3.2 `itemEncoding` (which has no
 * property name of its own; see {@link MediaTypeEncoding.itemEncoding}).
 */
function parseEncodingDetail(
  entry: Record<string, unknown>,
  names: Map<object, string>,
): Omit<MediaTypeEncoding, 'propertyName'> {
  const headers = asRecord(entry.headers);
  const declaredStyle = asString(entry.style);
  const style = declaredStyle ?? 'form';
  const declaredExplode = typeof entry.explode === 'boolean' ? entry.explode : undefined;
  const explode = declaredExplode ?? defaultExplode(style);
  const itemEncoding = asRecord(entry.itemEncoding);

  return {
    contentType: asString(entry.contentType),
    headers: headers
      ? Object.entries(headers).map(([name, headerValue]) => {
          const header = asRecord(headerValue) ?? {};
          const { schema, content } = parseSchemaOrContent(header, names);
          return {
            name,
            description: asString(header.description),
            required: header.required === true,
            deprecated: header.deprecated === true,
            schema,
            content,
          } satisfies ResponseHeader;
        })
      : undefined,
    style: { value: style, declared: declaredStyle !== undefined },
    explode: { value: explode, declared: declaredExplode !== undefined },
    allowReserved: entry.allowReserved === true ? true : undefined,
    // 3.2: per-item detail for a property that is itself an array of encoded items.
    itemSchema:
      entry.itemSchema !== undefined ? normaliseSchema(entry.itemSchema, { names }) : undefined,
    itemEncoding: itemEncoding ? parseEncodingDetail(itemEncoding, names) : undefined,
  };
}

/**
 * Collect examples from either spelling: the `examples` map (named, with summaries) or
 * the singular `example`.
 */
function parseExamples(holder: Record<string, unknown>): ExampleValue[] | undefined {
  const out: ExampleValue[] = [];
  const examples = asRecord(holder.examples);
  if (examples) {
    for (const [name, value] of Object.entries(examples)) {
      const example = asRecord(value);
      if (!example) continue;
      out.push({
        name,
        summary: asString(example.summary),
        description: asString(example.description),
        // 3.2 adds `dataValue` (the value in its native data type) and `serializedValue`
        // (already serialized for the media type) as alternatives to `value`. Reading
        // whichever is present, in that order, keeps every spelling showing *something*
        // rather than requiring three separate render paths for one concept.
        value:
          'value' in example
            ? example.value
            : 'dataValue' in example
              ? example.dataValue
              : example.serializedValue,
        // An example held at a URL instead of inlined. Kept as a link, never fetched.
        externalValue: asString(example.externalValue),
      });
    }
  }
  if ('example' in holder && holder.example !== undefined) {
    out.push({ name: 'Example', value: holder.example });
  }
  return out.length > 0 ? out : undefined;
}

/* -------------------------------------------------------------------------- */

/**
 * Build the sidebar: operations grouped by their first tag, in the order the document's
 * `tags` array declares, with untagged operations collected at the end.
 */
function buildNav(
  operations: Operation[],
  tags: TagInfo[],
  schemas: SchemaNode[],
  webhooks: Operation[],
): NavNode[] {
  const groups = new Map<string, Operation[]>();
  for (const tag of tags) groups.set(tag.name, []);

  for (const operation of operations) {
    const tag = operation.tags[0] ?? 'Other';
    const bucket = groups.get(tag);
    if (bucket) bucket.push(operation);
    else groups.set(tag, [operation]);
  }

  const nav: NavNode[] = [];
  const groupIds = new Set<string>();
  for (const [tag, tagOperations] of groups) {
    if (tagOperations.length === 0) continue;
    nav.push({
      id: uniqueId(`tag-${slugify(tag)}`, groupIds),
      label: tag,
      children: tagOperations.map((operation) => ({
        id: operation.id,
        label: operation.summary ?? `${operation.method} ${operation.path}`,
        badge: operation.method,
        badgeKind: operation.method.toLowerCase(),
        deprecated: operation.deprecated,
      })),
    });
  }

  // A flat "Webhooks" group, not sub-grouped by tag the way Operations is above -- a
  // webhook-first document is typically small enough that a single collapsed list reads
  // better than another layer of grouping (see the density note on card 38's brief).
  if (webhooks.length > 0) {
    nav.push({
      id: 'webhooks',
      label: 'Webhooks',
      children: webhooks.map((operation) => ({
        id: operation.id,
        label: operation.summary ?? `${operation.method} ${operation.path}`,
        badge: operation.method,
        badgeKind: operation.method.toLowerCase(),
        deprecated: operation.deprecated,
      })),
    });
  }

  const schemasNode = schemaNavigation(schemas);
  if (schemasNode) nav.push(schemasNode);

  return nav;
}
