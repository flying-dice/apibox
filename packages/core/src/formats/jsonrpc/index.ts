import { UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  JsonRpcDocument,
  NavNode,
  RpcError,
  RpcExample,
  RpcLink,
  RpcMethod,
  RpcParam,
  SchemaNode,
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

export interface ParseJsonRpcOptions {
  id?: string;
  location?: string;
}

/**
 * Parse an OpenRPC document — the interface description format for JSON-RPC 2.0 services.
 *
 * There is no established renderer for this format, which is part of why apibox renders
 * everything itself: at least one of the three was always going to be ours.
 */
export async function parseJsonRpc(
  raw: unknown,
  options: ParseJsonRpcOptions = {},
): Promise<JsonRpcDocument> {
  const root = asRecord(raw);
  if (!root) throw new UnsupportedDocumentError('Document is not an object.');

  const warnings: string[] = [];
  const dereferenced = await dereferenceDocument(root, options.location, warnings);
  const names = collectComponentNames(dereferenced);

  const info = asRecord(dereferenced.info) ?? {};
  const title = asString(info.title) ?? 'Untitled API';

  // Populated as a side effect of `parseMethods`, which is the only place a full (inline
  // or $ref-resolved) Tag Object is seen -- `RpcMethod.tags` itself keeps only names.
  const tagInfoByName = new Map<string, TagInfo>();
  const methods = parseMethods(dereferenced, names, tagInfoByName, warnings);
  const schemas = parseComponentSchemas(dereferenced, names);
  const contentDescriptors = parseComponentContentDescriptors(dereferenced, names);

  return {
    id: options.id ?? slugify(title),
    kind: 'jsonrpc',
    // The spec requires `openrpc` to be present, so this fallback is not expected to be
    // exercised by a compliant document; kept current with the spec version this parser
    // targets (1.3.2) rather than the long-superseded 1.2.6 it previously fell back to.
    specVersion: asString(dereferenced.openrpc) ?? '1.3.2',
    title,
    version: asString(info.version) ?? '0.0.0',
    summary: asString(info.summary),
    description: asString(info.description),
    termsOfService: asString(info.termsOfService),
    contact: parseContact(info.contact),
    license: parseLicense(info.license),
    externalDocs: parseExternalDocs(dereferenced.externalDocs),
    servers: parseServers(dereferenced.servers),
    tags: collectTags(methods, tagInfoByName),
    methods,
    schemas,
    contentDescriptors,
    nav: buildNav(methods, schemas, contentDescriptors),
    warnings,
    extensions: parseExtensions(dereferenced),
  };
}

/**
 * Named entries under `components.contentDescriptors`, independent of which params/results
 * reference them via `$ref` -- the same "browse everything reusable" gap `components.schemas`
 * already closed, applied to the one other component bucket whose entries carry their own
 * distinguishing `name`, the way a schema does.
 *
 * The other component buckets deliberately do *not* get this treatment:
 * - `components.tags` / `components.examplePairings` / `components.examples`: any entry a
 *   method actually references already renders in full at that method (tags: the nav group
 *   header; example pairings/examples: the method's own Examples section, resolved by
 *   `dereferenceDocument`). A catalogue of these would either repeat that content verbatim
 *   or -- for an entry no method references at all -- show something that is arguably dead
 *   weight in the source document, not a discoverability gap in apibox.
 * - `components.links`: same "already renders where referenced" reasoning as tags/examples,
 *   and, unlike a ContentDescriptor, a Link Object's value is inherently about a specific
 *   result -> next-call relationship -- showing it divorced from the method whose result it
 *   follows from would need re-explaining that context, not just re-displaying a name.
 */
function parseComponentContentDescriptors(
  root: Record<string, unknown>,
  names: Map<object, string>,
): RpcParam[] {
  const descriptors = asRecord(asRecord(root.components)?.contentDescriptors);
  if (!descriptors) return [];
  return Object.entries(descriptors)
    .map(([key, value]): RpcParam | undefined => {
      const entry = asRecord(value);
      if (!entry) return undefined;
      return {
        name: asString(entry.name) ?? key,
        summary: asString(entry.summary),
        description: asString(entry.description),
        required: entry.required === true,
        deprecated: entry.deprecated === true,
        schema: normaliseSchema(entry.schema, { names }),
        extensions: parseExtensions(entry),
      };
    })
    .filter((entry): entry is RpcParam => entry !== undefined);
}

/** `x-*` specification extensions found directly on `record`, in declaration order. */
function parseExtensions(
  record: Record<string, unknown>,
): Array<{ key: string; value: unknown }> | undefined {
  const entries = Object.entries(record).filter(([key]) => isExtensionKey(key));
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : undefined;
}

function parseServers(raw: unknown): ServerInfo[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      name: asString(entry.name) ?? asString(entry.url) ?? 'server',
      url: asString(entry.url) ?? '',
      summary: asString(entry.summary),
      description: asString(entry.description),
      variables: parseServerVariables(entry.variables),
      extensions: parseExtensions(entry),
    }));
}

/**
 * The Server Object's `variables` is a map keyed by variable name (unlike AsyncAPI's list
 * form), so this reshapes it into the same `{ name, default, description, enum }[]` that
 * `ServerInfo.variables` already defines and `ServerList.svelte` already renders.
 */
function parseServerVariables(raw: unknown): ServerInfo['variables'] {
  const variables = asRecord(raw);
  if (!variables) return undefined;
  const entries = Object.entries(variables).flatMap(([name, value]) => {
    const variable = asRecord(value);
    if (!variable) return [];
    const enumValues = asArray(variable.enum)
      .map((entry) => asString(entry))
      .filter((entry): entry is string => Boolean(entry));
    return [
      {
        name,
        default: asString(variable.default),
        description: asString(variable.description),
        enum: enumValues.length > 0 ? enumValues : undefined,
      },
    ];
  });
  return entries.length > 0 ? entries : undefined;
}

function parseMethods(
  root: Record<string, unknown>,
  names: Map<object, string>,
  tagInfoByName: Map<string, TagInfo>,
  warnings: string[],
): RpcMethod[] {
  const rawMethods = asArray(root.methods);
  if (rawMethods.length === 0) warnings.push('The document declares no methods.');

  const taken = new Set<string>();
  return rawMethods
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && asString(entry.name)))
    .map((entry) => {
      const name = asString(entry.name) as string;
      const result = asRecord(entry.result);
      const servers = parseServers(entry.servers);
      return {
        id: uniqueId(slugify(name), taken),
        name,
        summary: asString(entry.summary),
        description: asString(entry.description),
        deprecated: entry.deprecated === true,
        tags: asArray(entry.tags)
          .map((tag) => {
            // A `$ref` to `components.tags` has already been resolved to the same Tag
            // Object it points at by the time we get here, so this sees full metadata
            // whether the tag was declared inline or shared.
            const record = asRecord(tag);
            const tagName = asString(record?.name) ?? asString(tag);
            if (tagName && record && !tagInfoByName.has(tagName)) {
              tagInfoByName.set(tagName, {
                name: tagName,
                description: asString(record.description),
                externalDocs: parseExternalDocs(record.externalDocs),
                extensions: parseExtensions(record),
              });
            }
            return tagName;
          })
          .filter((tag): tag is string => Boolean(tag)),
        paramStructure: toParamStructure(asString(entry.paramStructure)),
        params: parseParams(entry.params, names),
        result: result
          ? {
              name: asString(result.name) ?? 'result',
              summary: asString(result.summary),
              description: asString(result.description),
              schema: normaliseSchema(result.schema, { names }),
              deprecated: result.deprecated === true,
            }
          : undefined,
        errors: parseErrors(entry.errors, names),
        examples: parseExamples(entry.examples, toParamStructure(asString(entry.paramStructure))),
        links: parseLinks(entry.links),
        servers: servers.length > 0 ? servers : undefined,
        externalDocs: parseExternalDocs(entry.externalDocs),
        extensions: parseExtensions(entry),
      } satisfies RpcMethod;
    });
}

/**
 * The Link Object. `params` is a map (name -> literal value or runtime expression) rather
 * than a list in the source document; it is reshaped into a name/value pair list so
 * declaration order survives, the same treatment `SchemaNode.extensions` gets.
 */
function parseLinks(raw: unknown): RpcLink[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && asString(entry.name)))
    .map((entry) => {
      const params = asRecord(entry.params);
      const server = asRecord(entry.server);
      return {
        name: asString(entry.name) as string,
        description: asString(entry.description),
        summary: asString(entry.summary),
        method: asString(entry.method),
        params: params
          ? Object.entries(params).map(([paramName, value]) => ({ name: paramName, value }))
          : undefined,
        server: server
          ? {
              name: asString(server.name) ?? asString(server.url) ?? 'server',
              url: asString(server.url) ?? '',
              summary: asString(server.summary),
              description: asString(server.description),
              variables: parseServerVariables(server.variables),
              extensions: parseExtensions(server),
            }
          : undefined,
        extensions: parseExtensions(entry),
      } satisfies RpcLink;
    });
}

/** OpenRPC's default is `either`: a server accepting both named and positional params. */
function toParamStructure(value: string | undefined): RpcMethod['paramStructure'] {
  return value === 'by-name' || value === 'by-position' ? value : 'either';
}

function parseParams(raw: unknown, names: Map<object, string>): RpcParam[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && asString(entry.name)))
    .map((entry) => ({
      name: asString(entry.name) as string,
      summary: asString(entry.summary),
      description: asString(entry.description),
      required: entry.required === true,
      deprecated: entry.deprecated === true,
      schema: normaliseSchema(entry.schema, { names }),
      extensions: parseExtensions(entry),
    }));
}

function parseErrors(raw: unknown, names: Map<object, string>): RpcError[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      code: typeof entry.code === 'number' ? entry.code : 0,
      message: asString(entry.message) ?? '',
      description: asString(entry.description),
      schema: normaliseSchema(entry.data, { names }),
      extensions: parseExtensions(entry),
    }));
}

function parseExamples(raw: unknown, structure: RpcMethod['paramStructure']): RpcExample[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => {
      // Params are a list of named example values; collapse them to the shape a caller
      // would actually send, so the example can be shown as a real JSON-RPC payload. A
      // param given only by `externalValue` (no inline `value`) has nowhere else to go in
      // this collapsed shape, so its URL is surfaced as the placeholder value in that slot
      // rather than silently dropped.
      const params = asArray(entry.params).map((param) => {
        const record = asRecord(param);
        if (!record) return param;
        if ('value' in record) return record.value;
        return asString(record.externalValue) ?? param;
      });
      const paramNames = asArray(entry.params).map((param) => asString(asRecord(param)?.name));
      // The method's declared encoding is the authority. An example's items carry names
      // even for a positional method, so inferring the shape from them alone produces a
      // request that the method would reject.
      const named =
        structure === 'by-position' ? false : structure === 'by-name' || paramNames.every(Boolean);
      const result = asRecord(entry.result);

      return {
        name: asString(entry.name) ?? 'Example',
        summary: asString(entry.summary),
        description: asString(entry.description),
        params: named
          ? Object.fromEntries(paramNames.map((paramName, i) => [paramName as string, params[i]]))
          : params,
        result: result && 'value' in result ? result.value : undefined,
        // Unlike params, the result is a single Example Object -- room enough to model
        // `externalValue` properly, as its own field, rather than as a placeholder.
        resultExternalValue:
          result && !('value' in result) ? asString(result.externalValue) : undefined,
        extensions: parseExtensions(entry),
      } satisfies RpcExample;
    });
}

function collectTags(methods: RpcMethod[], tagInfoByName: Map<string, TagInfo>): TagInfo[] {
  const seen = new Set<string>();
  const tags: TagInfo[] = [];
  for (const method of methods) {
    for (const tag of method.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tagInfoByName.get(tag) ?? { name: tag });
    }
  }
  return tags;
}

function buildNav(
  methods: RpcMethod[],
  schemas: SchemaNode[],
  contentDescriptors: RpcParam[],
): NavNode[] {
  const groups = new Map<string, RpcMethod[]>();
  for (const method of methods) {
    const tag = method.tags[0] ?? 'Methods';
    const bucket = groups.get(tag);
    if (bucket) bucket.push(method);
    else groups.set(tag, [method]);
  }

  const groupIds = new Set<string>();
  const nav: NavNode[] = [...groups].map(([tag, tagMethods]) => ({
    id: uniqueId(`tag-${slugify(tag)}`, groupIds),
    label: tag,
    children: tagMethods.map((method) => ({
      id: method.id,
      label: method.name,
      badge: 'RPC',
      badgeKind: 'rpc',
      deprecated: method.deprecated,
    })),
  }));

  const schemasNode = schemaNavigation(schemas);
  if (schemasNode) nav.push(schemasNode);

  if (contentDescriptors.length > 0) {
    const childIds = new Set<string>();
    nav.push({
      id: 'content-descriptors',
      label: 'Content Descriptors',
      children: contentDescriptors.map((descriptor) => ({
        id: uniqueId(`content-descriptor-${slugify(descriptor.name)}`, childIds),
        label: descriptor.name,
        deprecated: descriptor.deprecated,
      })),
    });
  }

  return nav;
}
