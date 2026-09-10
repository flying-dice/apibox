import { UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  ExampleValue,
  MediaTypeBody,
  NavNode,
  OpenApiDocument,
  Operation,
  Parameter,
  ParameterLocation,
  RequestBodyInfo,
  ResponseHeader,
  ResponseInfo,
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
  const warnings: string[] = [];

  const dereferenced = await dereferenceDocument(root, options.location, warnings);
  const names = collectComponentNames(dereferenced);

  const info = asRecord(dereferenced.info) ?? {};
  const title = asString(info.title) ?? 'Untitled API';
  const version = asString(info.version) ?? '0.0.0';

  const tags = parseTags(dereferenced.tags);
  const servers = parseServers(dereferenced.servers);
  const securitySchemes = parseSecuritySchemes(dereferenced);
  const operations = parseOperations(dereferenced, names, servers, warnings);
  const schemas = parseComponentSchemas(dereferenced, names);

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
    nav: buildNav(operations, tags, schemas),
    warnings,
  };
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
): Operation[] {
  const paths = asRecord(root.paths);
  if (!paths) {
    warnings.push('The document declares no paths.');
    return [];
  }

  const taken = new Set<string>();
  const operations: Operation[] = [];

  for (const [path, pathValue] of Object.entries(paths)) {
    const pathItem = asRecord(pathValue);
    if (!pathItem) continue;

    // Path-level parameters apply to every operation under the path, unless an operation
    // declares one with the same name and location.
    const sharedParameters = parseParameters(pathItem.parameters, names);
    const pathServers = parseServers(pathItem.servers);

    for (const method of METHODS) {
      const operationValue = asRecord(pathItem[method]);
      if (!operationValue) continue;

      const operationId = asString(operationValue.operationId);
      const id = uniqueId(slugify(operationId ?? `${method}-${path}`), taken);
      const ownParameters = parseParameters(operationValue.parameters, names);
      const ownServers = parseServers(operationValue.servers);

      operations.push({
        id,
        method: method.toUpperCase(),
        path,
        operationId,
        summary: asString(operationValue.summary),
        description: asString(operationValue.description),
        deprecated: operationValue.deprecated === true,
        tags: asArray(operationValue.tags).filter((t): t is string => typeof t === 'string'),
        servers:
          ownServers.length > 0
            ? ownServers
            : pathServers.length > 0
              ? pathServers
              : documentServers,
        externalDocs: parseExternalDocs(operationValue.externalDocs),
        parameters: mergeParameters(sharedParameters, ownParameters),
        requestBody: parseRequestBody(operationValue.requestBody, names),
        responses: parseResponses(operationValue.responses, names),
        security: parseSecurity(operationValue.security),
      });
    }
  }

  return operations;
}

/** Operation parameters override path parameters that share a name and location. */
function mergeParameters(shared: Parameter[], own: Parameter[]): Parameter[] {
  const overridden = new Set(own.map((p) => `${p.in}:${p.name}`));
  return [...shared.filter((p) => !overridden.has(`${p.in}:${p.name}`)), ...own];
}

const PARAM_ORDER: ParameterLocation[] = ['path', 'query', 'header', 'cookie'];

function parseParameters(raw: unknown, names: Map<object, string>): Parameter[] {
  const parsed = asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && asString(entry.name)))
    .map((entry) => {
      const location = (asString(entry.in) ?? 'query') as ParameterLocation;
      const { schema, content } = parseSchemaOrContent(entry, names);
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
      } satisfies ResponseInfo;
    })
    .sort(compareStatus);
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
    } satisfies MediaTypeBody;
  });
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
        value: 'value' in example ? example.value : undefined,
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
function buildNav(operations: Operation[], tags: TagInfo[], schemas: SchemaNode[]): NavNode[] {
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

  const schemasNode = schemaNavigation(schemas);
  if (schemasNode) nav.push(schemasNode);

  return nav;
}
