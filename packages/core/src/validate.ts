import type { ApiDocument, FormatId, Manifest } from './types.js';

const FORMATS = new Set<FormatId>(['openapi', 'asyncapi', 'jsonrpc', 'jsonschema']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isString);
}

function hasUniqueIds(values: unknown[]): boolean {
  const ids = new Set<string>();
  for (const value of values) {
    if (!isRecord(value) || !isString(value.id) || ids.has(value.id)) return false;
    ids.add(value.id);
  }
  return true;
}

/** Rejects cyclic, pathologically deep, or unreasonably large host-provided models. */
function isBoundedTree(value: unknown): boolean {
  const visiting = new Set<object>();
  const visited = new Set<object>();
  const stack: Array<{ value: unknown; depth: number; leaving: boolean }> = [
    { value, depth: 0, leaving: false },
  ];
  let count = 0;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame || (typeof frame.value !== 'object' && !Array.isArray(frame.value))) continue;
    if (frame.value === null) continue;
    const object = frame.value as object;
    if (frame.leaving) {
      visiting.delete(object);
      visited.add(object);
      continue;
    }
    if (visiting.has(object) || frame.depth > 256 || count >= 100_000) return false;
    if (visited.has(object)) continue;
    count += 1;
    visiting.add(object);
    stack.push({ ...frame, leaving: true });
    const children = Array.isArray(frame.value) ? frame.value : Object.values(frame.value);
    for (const child of children) {
      if (typeof child === 'object' && child !== null) {
        stack.push({ value: child, depth: frame.depth + 1, leaving: false });
      }
    }
  }
  return true;
}

function isNav(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const stack: unknown[][] = [value];
  while (stack.length > 0) {
    const siblings = stack.pop();
    if (!siblings) continue;
    const siblingIds = new Set<string>();
    for (const node of siblings) {
      if (!isRecord(node) || !isString(node.id) || !isString(node.label)) return false;
      if (siblingIds.has(node.id)) return false;
      siblingIds.add(node.id);
      if (node.badge !== undefined && !isString(node.badge)) return false;
      if (node.badgeKind !== undefined && !isString(node.badgeKind)) return false;
      if (node.deprecated !== undefined && typeof node.deprecated !== 'boolean') return false;
      if (node.children !== undefined) {
        if (!Array.isArray(node.children)) return false;
        stack.push(node.children);
      }
    }
  }
  return true;
}

function hasOptionalStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => value[key] === undefined || isString(value[key]));
}

function hasOptionalBooleans(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => value[key] === undefined || typeof value[key] === 'boolean');
}

/** `x-*` extensions, shaped `{ key, value }[]`, shared by every format that models them. */
function hasOptionalExtensions(value: Record<string, unknown>): boolean {
  return (
    value.extensions === undefined ||
    (Array.isArray(value.extensions) &&
      value.extensions.every((entry) => isRecord(entry) && isString(entry.key) && 'value' in entry))
  );
}

/**
 * OpenRPC's ContentDescriptor Object -- shared by a method's own `params`/`result` and by
 * `components.contentDescriptors`' catalogue entries, so this is factored out rather than
 * duplicated the way the two call sites used to check the same shape independently.
 */
function isRpcParam(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.name) &&
    hasOptionalStrings(value, ['summary', 'description']) &&
    typeof value.required === 'boolean' &&
    hasOptionalBooleans(value, ['deprecated']) &&
    (value.schema === undefined || isSchema(value.schema)) &&
    hasOptionalExtensions(value)
  );
}

function isExternalDocs(value: unknown): boolean {
  return isRecord(value) && isString(value.url) && hasOptionalStrings(value, ['description']);
}

function isServer(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.name) || !isString(value.url)) return false;
  if (!hasOptionalStrings(value, ['description', 'protocol'])) return false;
  return (
    value.variables === undefined ||
    (Array.isArray(value.variables) &&
      value.variables.every(
        (variable) =>
          isRecord(variable) &&
          isString(variable.name) &&
          hasOptionalStrings(variable, ['default', 'description']) &&
          (variable.enum === undefined || isStringArray(variable.enum)),
      ))
  );
}

function isExample(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.name) &&
    hasOptionalStrings(value, ['summary', 'description']) &&
    // An example given only by `externalValue` legitimately has no `value` key at all --
    // serializing `{ value: undefined }` drops the key entirely, so requiring it
    // unconditionally would reject exactly the externally-hosted examples card 38 added.
    ('value' in value || isString(value.externalValue))
  );
}

function isSchema(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length > 0) {
    const candidate = stack.pop();
    if (!isRecord(candidate)) return false;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (!isStringArray(candidate.types)) return false;
    if (
      !hasOptionalStrings(candidate, [
        'name',
        'title',
        'format',
        'description',
        'circularRef',
        'unresolvedRef',
        'refName',
        'schemaId',
        'anchor',
        'dynamicRef',
        'dynamicAnchor',
        'contentEncoding',
        'contentMediaType',
      ]) ||
      !hasOptionalBooleans(candidate, [
        'required',
        'deprecated',
        'readOnly',
        'writeOnly',
        'nullable',
        'allowsAdditionalProperties',
      ])
    ) {
      return false;
    }
    if (candidate.enum !== undefined && !Array.isArray(candidate.enum)) return false;
    if (candidate.examples !== undefined && !Array.isArray(candidate.examples)) return false;
    if (
      candidate.constraints !== undefined &&
      (!Array.isArray(candidate.constraints) ||
        !candidate.constraints.every(
          (constraint) =>
            isRecord(constraint) && isString(constraint.label) && isString(constraint.value),
        ))
    ) {
      return false;
    }
    for (const key of ['properties', 'tupleItems'] as const) {
      const children = candidate[key];
      if (children !== undefined) {
        if (!Array.isArray(children)) return false;
        stack.push(...children);
      }
    }
    for (const key of ['additionalProperties', 'items', 'contentSchema'] as const) {
      const child = candidate[key];
      if (child !== undefined) stack.push(child);
    }
    if (candidate.compositions !== undefined) {
      if (!Array.isArray(candidate.compositions)) return false;
      for (const composition of candidate.compositions) {
        if (
          !isRecord(composition) ||
          !['oneOf', 'anyOf', 'allOf', 'not'].includes(String(composition.kind)) ||
          !Array.isArray(composition.options)
        ) {
          return false;
        }
        stack.push(...composition.options);
      }
    }
  }
  return true;
}

function isMediaType(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.contentType) &&
    (value.schema === undefined || isSchema(value.schema)) &&
    (value.examples === undefined ||
      (Array.isArray(value.examples) && value.examples.every(isExample)))
  );
}

function isParameter(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.name) &&
    ['path', 'query', 'header', 'cookie'].includes(String(value.in)) &&
    typeof value.required === 'boolean' &&
    hasOptionalStrings(value, ['description']) &&
    hasOptionalBooleans(value, ['deprecated']) &&
    (value.schema === undefined || isSchema(value.schema)) &&
    (value.content === undefined ||
      (Array.isArray(value.content) && value.content.every(isMediaType))) &&
    (value.examples === undefined ||
      (Array.isArray(value.examples) && value.examples.every(isExample)))
  );
}

function isSecurityRequirement(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.alternatives) &&
    value.alternatives.every(
      (alternative) =>
        isRecord(alternative) && isString(alternative.scheme) && isStringArray(alternative.scopes),
    )
  );
}

function isSecurityScheme(value: unknown): boolean {
  if (!isRecord(value) || !isString(value.name) || !isString(value.type)) return false;
  if (
    !hasOptionalStrings(value, [
      'description',
      'in',
      'paramName',
      'httpScheme',
      'bearerFormat',
      'openIdConnectUrl',
    ])
  ) {
    return false;
  }
  return (
    value.flows === undefined ||
    (Array.isArray(value.flows) &&
      value.flows.every(
        (flow) =>
          isRecord(flow) &&
          isString(flow.kind) &&
          hasOptionalStrings(flow, ['authorizationUrl', 'tokenUrl', 'refreshUrl']) &&
          Array.isArray(flow.scopes) &&
          flow.scopes.every(
            (scope) =>
              isRecord(scope) && isString(scope.name) && hasOptionalStrings(scope, ['description']),
          ),
      ))
  );
}

function hasDocumentBase(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isString(value.kind) &&
    FORMATS.has(value.kind as FormatId) &&
    isString(value.title) &&
    isString(value.version) &&
    isString(value.specVersion) &&
    Array.isArray(value.servers) &&
    value.servers.every(isServer) &&
    Array.isArray(value.tags) &&
    value.tags.every(
      (tag) =>
        isRecord(tag) &&
        isString(tag.name) &&
        hasOptionalStrings(tag, ['description']) &&
        (tag.externalDocs === undefined || isExternalDocs(tag.externalDocs)),
    ) &&
    isNav(value.nav) &&
    isStringArray(value.warnings) &&
    (value.summary === undefined || isString(value.summary)) &&
    (value.description === undefined || isString(value.description)) &&
    (value.contact === undefined ||
      (isRecord(value.contact) && hasOptionalStrings(value.contact, ['name', 'url', 'email']))) &&
    (value.license === undefined ||
      (isRecord(value.license) &&
        isString(value.license.name) &&
        hasOptionalStrings(value.license, ['url']))) &&
    (value.externalDocs === undefined || isExternalDocs(value.externalDocs))
  );
}

function isOpenApiOperation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.method) &&
    isString(value.path) &&
    typeof value.deprecated === 'boolean' &&
    isStringArray(value.tags) &&
    Array.isArray(value.servers) &&
    value.servers.every(isServer) &&
    Array.isArray(value.parameters) &&
    value.parameters.every(isParameter) &&
    Array.isArray(value.responses) &&
    value.responses.every(isResponse) &&
    hasOptionalStrings(value, ['operationId', 'summary', 'description']) &&
    (value.externalDocs === undefined || isExternalDocs(value.externalDocs)) &&
    (value.requestBody === undefined || isRequestBody(value.requestBody)) &&
    (value.security === undefined ||
      (Array.isArray(value.security) && value.security.every(isSecurityRequirement)))
  );
}

function isRequestBody(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.required === 'boolean' &&
    hasOptionalStrings(value, ['description']) &&
    Array.isArray(value.content) &&
    value.content.every(isMediaType)
  );
}

function isResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.status) &&
    hasOptionalStrings(value, ['description']) &&
    Array.isArray(value.headers) &&
    value.headers.every(
      (header) =>
        isRecord(header) &&
        isString(header.name) &&
        hasOptionalStrings(header, ['description']) &&
        hasOptionalBooleans(header, ['required', 'deprecated']) &&
        (header.schema === undefined || isSchema(header.schema)) &&
        (header.content === undefined ||
          (Array.isArray(header.content) && header.content.every(isMediaType))),
    ) &&
    Array.isArray(value.content) &&
    value.content.every(isMediaType)
  );
}

function isAsyncOperation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.action === 'send' || value.action === 'receive') &&
    isString(value.channelAddress) &&
    hasOptionalStrings(value, ['channelTitle', 'summary', 'description']) &&
    Array.isArray(value.parameters) &&
    value.parameters.every(isParameter) &&
    Array.isArray(value.messages) &&
    value.messages.every(
      (message) =>
        isRecord(message) &&
        isString(message.name) &&
        hasOptionalStrings(message, ['title', 'summary', 'description', 'contentType']) &&
        (message.payload === undefined || isSchema(message.payload)) &&
        (message.headers === undefined || isSchema(message.headers)) &&
        (message.examples === undefined ||
          (Array.isArray(message.examples) && message.examples.every(isExample))),
    )
  );
}

function isRpcMethod(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    typeof value.deprecated === 'boolean' &&
    isStringArray(value.tags) &&
    ['by-name', 'by-position', 'either'].includes(String(value.paramStructure)) &&
    hasOptionalStrings(value, ['summary', 'description']) &&
    Array.isArray(value.params) &&
    value.params.every(isRpcParam) &&
    Array.isArray(value.errors) &&
    value.errors.every(
      (error) =>
        isRecord(error) &&
        typeof error.code === 'number' &&
        isString(error.message) &&
        hasOptionalStrings(error, ['description']) &&
        (error.schema === undefined || isSchema(error.schema)) &&
        hasOptionalExtensions(error),
    ) &&
    Array.isArray(value.examples) &&
    value.examples.every(
      (example) =>
        isRecord(example) &&
        isString(example.name) &&
        hasOptionalStrings(example, ['summary', 'description']) &&
        'params' in example &&
        // Either an inline result or an externally hosted one. Requiring `result`
        // unconditionally rejects an externalValue-only example outright, because an
        // absent `result` is dropped entirely by JSON serialisation -- the same trap
        // `isExample` hit for OpenAPI.
        ('result' in example || isString(example.resultExternalValue)) &&
        hasOptionalExtensions(example),
    ) &&
    (value.result === undefined ||
      (isRecord(value.result) &&
        isString(value.result.name) &&
        hasOptionalStrings(value.result, ['summary', 'description']) &&
        (value.result.schema === undefined || isSchema(value.result.schema))))
  );
}

export function isManifest(value: unknown): value is Manifest {
  if (!isBoundedTree(value) || !isRecord(value) || value.schemaVersion !== 1) return false;
  if (!isString(value.title) || !isString(value.generatedAt) || !isString(value.generator))
    return false;
  if (!Array.isArray(value.documents)) return false;
  const ids = new Set<string>();
  return value.documents.every((entry) => {
    if (!isRecord(entry)) return false;
    if (
      !isString(entry.id) ||
      !isString(entry.kind) ||
      !FORMATS.has(entry.kind as FormatId) ||
      !isString(entry.title) ||
      !isString(entry.version) ||
      !isString(entry.path) ||
      ids.has(entry.id)
    ) {
      return false;
    }
    ids.add(entry.id);
    return true;
  });
}

export function isApiDocument(value: unknown, expectedId?: string): value is ApiDocument {
  if (!isBoundedTree(value) || !isRecord(value) || !hasDocumentBase(value)) return false;
  if (expectedId !== undefined && value.id !== expectedId) return false;
  if (!Array.isArray(value.schemas) || !value.schemas.every(isSchema)) return false;
  switch (value.kind) {
    case 'openapi':
      return (
        Array.isArray(value.operations) &&
        hasUniqueIds(value.operations) &&
        value.operations.every(isOpenApiOperation) &&
        Array.isArray(value.securitySchemes) &&
        value.securitySchemes.every(isSecurityScheme) &&
        (value.security === undefined ||
          (Array.isArray(value.security) && value.security.every(isSecurityRequirement))) &&
        (value.webhooks === undefined ||
          (Array.isArray(value.webhooks) && value.webhooks.every(isOpenApiOperation)))
      );
    case 'asyncapi':
      return (
        Array.isArray(value.operations) &&
        hasUniqueIds(value.operations) &&
        value.operations.every(isAsyncOperation)
      );
    case 'jsonrpc':
      return (
        Array.isArray(value.methods) &&
        hasUniqueIds(value.methods) &&
        value.methods.every(isRpcMethod) &&
        Array.isArray(value.contentDescriptors) &&
        value.contentDescriptors.every(isRpcParam)
      );
    case 'jsonschema':
      return (
        (value.root === undefined || isSchema(value.root)) &&
        (value.schemaId === undefined || isString(value.schemaId))
      );
    default:
      return false;
  }
}
