import { UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type {
  JsonRpcDocument,
  NavNode,
  RpcError,
  RpcExample,
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
  parseComponentSchemas,
  parseContact,
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

  const methods = parseMethods(dereferenced, names, warnings);
  const schemas = parseComponentSchemas(dereferenced, names);

  return {
    id: options.id ?? slugify(title),
    kind: 'jsonrpc',
    specVersion: asString(dereferenced.openrpc) ?? '1.2.6',
    title,
    version: asString(info.version) ?? '0.0.0',
    description: asString(info.description),
    contact: parseContact(info.contact),
    license: parseLicense(info.license),
    servers: parseServers(dereferenced.servers),
    tags: collectTags(methods),
    methods,
    schemas,
    nav: buildNav(methods, schemas),
    warnings,
  };
}

function parseServers(raw: unknown): ServerInfo[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      name: asString(entry.name) ?? asString(entry.url) ?? 'server',
      url: asString(entry.url) ?? '',
      description: asString(entry.summary) ?? asString(entry.description),
    }));
}

function parseMethods(
  root: Record<string, unknown>,
  names: Map<object, string>,
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
      return {
        id: uniqueId(slugify(name), taken),
        name,
        summary: asString(entry.summary),
        description: asString(entry.description),
        deprecated: entry.deprecated === true,
        tags: asArray(entry.tags)
          .map((tag) => asString(asRecord(tag)?.name) ?? asString(tag))
          .filter((tag): tag is string => Boolean(tag)),
        paramStructure: toParamStructure(asString(entry.paramStructure)),
        params: parseParams(entry.params, names),
        result: result
          ? {
              name: asString(result.name) ?? 'result',
              description: asString(result.description) ?? asString(result.summary),
              schema: normaliseSchema(result.schema, { names }),
            }
          : undefined,
        errors: parseErrors(entry.errors, names),
        examples: parseExamples(entry.examples, toParamStructure(asString(entry.paramStructure))),
      } satisfies RpcMethod;
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
      description: asString(entry.description) ?? asString(entry.summary),
      required: entry.required === true,
      deprecated: entry.deprecated === true,
      schema: normaliseSchema(entry.schema, { names }),
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
    }));
}

function parseExamples(raw: unknown, structure: RpcMethod['paramStructure']): RpcExample[] {
  return asArray(raw)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => {
      // Params are a list of named example values; collapse them to the shape a caller
      // would actually send, so the example can be shown as a real JSON-RPC payload.
      const params = asArray(entry.params).map((param) => {
        const record = asRecord(param);
        return record && 'value' in record ? record.value : param;
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
        description: asString(entry.description) ?? asString(entry.summary),
        params: named
          ? Object.fromEntries(paramNames.map((paramName, i) => [paramName as string, params[i]]))
          : params,
        result: result && 'value' in result ? result.value : undefined,
      } satisfies RpcExample;
    });
}

function collectTags(methods: RpcMethod[]): TagInfo[] {
  const seen = new Set<string>();
  const tags: TagInfo[] = [];
  for (const method of methods) {
    for (const tag of method.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      tags.push({ name: tag });
    }
  }
  return tags;
}

function buildNav(methods: RpcMethod[], schemas: SchemaNode[]): NavNode[] {
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

  return nav;
}
