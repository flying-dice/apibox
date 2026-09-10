// @bun
// packages/cli/src/build.ts
import { cp, mkdir, readFile as readFile2, writeFile } from "fs/promises";
import { dirname, resolve as resolve2 } from "path";
import { fileURLToPath } from "url";

// packages/core/src/utils.ts
function slugify(input) {
  return input.normalize("NFKD").replace(/[\u0300-\u036F]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "untitled";
}
function uniqueId(id, taken) {
  if (!taken.has(id)) {
    taken.add(id);
    return id;
  }
  let n = 2;
  while (taken.has(`${id}-${n}`))
    n += 1;
  const next = `${id}-${n}`;
  taken.add(next);
  return next;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// packages/core/src/detect.ts
function detectFormat(raw) {
  const doc = asRecord(raw);
  if (!doc)
    return;
  const openapi = asString(doc.openapi);
  if (openapi)
    return { format: "openapi", specVersion: openapi };
  const asyncapi = asString(doc.asyncapi);
  if (asyncapi)
    return { format: "asyncapi", specVersion: asyncapi };
  const openrpc = asString(doc.openrpc);
  if (openrpc)
    return { format: "jsonrpc", specVersion: openrpc };
  const swagger = asString(doc.swagger);
  if (swagger)
    return { format: "openapi", specVersion: swagger };
  return;
}

class UnsupportedDocumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedDocumentError";
  }
}
// packages/core/src/load.ts
import { readFile } from "fs/promises";
import { basename, extname } from "path";
import { parse as parseYaml } from "yaml";
async function loadSource(location) {
  const isUrl = /^https?:\/\//i.test(location);
  const text = isUrl ? await fetchText(location) : await readFile(location, "utf8");
  const name = deriveName(location);
  try {
    return { location, name, raw: parseDocument(text) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${location}: ${message}`, { cause: error });
  }
}
function parseDocument(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch {}
  }
  return parseYaml(text, { merge: true });
}
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}
function deriveName(location) {
  const withoutQuery = location.split(/[?#]/)[0] ?? location;
  const base = basename(withoutQuery);
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  return stem.replace(/\.(openapi|asyncapi|openrpc|jsonrpc|api|spec)$/i, "") || "api";
}
// packages/core/src/formats/asyncapi/index.ts
import { Parser } from "@asyncapi/parser";

// packages/core/src/schema.ts
var CONSTRAINT_KEYS = [
  ["format", "format"],
  ["pattern", "pattern"],
  ["minLength", "min length"],
  ["maxLength", "max length"],
  ["minimum", "min"],
  ["maximum", "max"],
  ["exclusiveMinimum", "exclusive min"],
  ["exclusiveMaximum", "exclusive max"],
  ["multipleOf", "multiple of"],
  ["minItems", "min items"],
  ["maxItems", "max items"],
  ["uniqueItems", "unique items"],
  ["minProperties", "min properties"],
  ["maxProperties", "max properties"]
];
var DEFAULT_MAX_DEPTH = 12;
function normaliseSchema(raw, options = {}, name, required) {
  if (raw === undefined || raw === null)
    return;
  return walk(raw, name, required, {
    seen: new Map,
    depth: 0,
    options
  });
}
function walk(raw, name, required, frame) {
  if (typeof raw === "boolean") {
    return { name, required, types: raw ? [] : ["never"] };
  }
  if (typeof raw !== "object" || raw === null) {
    return { name, required, types: [] };
  }
  const schema = raw;
  const refName = frame.options.names?.get(raw);
  const unresolvedRef = typeof schema.$ref === "string" ? schema.$ref : undefined;
  if (unresolvedRef) {
    return {
      name,
      required,
      unresolvedRef,
      refName: refName ?? unresolvedRef.split("/").pop(),
      types: [],
      description: asString(schema.description)
    };
  }
  const back = frame.seen.get(raw);
  if (back !== undefined) {
    return {
      name,
      required,
      refName,
      types: toTypes(schema),
      description: asString(schema.description),
      circularRef: back
    };
  }
  if (frame.depth >= (frame.options.maxDepth ?? DEFAULT_MAX_DEPTH)) {
    return {
      name,
      required,
      refName,
      types: toTypes(schema),
      description: asString(schema.description),
      circularRef: refName ?? name ?? "schema"
    };
  }
  const node = {
    name,
    required,
    refName,
    title: asString(schema.title),
    types: toTypes(schema),
    description: asString(schema.description)
  };
  const format = asString(schema.format);
  if (format)
    node.format = format;
  if (schema.deprecated === true)
    node.deprecated = true;
  if (schema.readOnly === true)
    node.readOnly = true;
  if (schema.writeOnly === true)
    node.writeOnly = true;
  if (schema.nullable === true || node.types.includes("null"))
    node.nullable = true;
  if ("default" in schema)
    node.default = schema.default;
  const enumValues = toEnum(schema);
  if (enumValues)
    node.enum = enumValues;
  const examples = toExamples(schema);
  if (examples.length > 0)
    node.examples = examples;
  const constraints = toConstraints(schema);
  if (constraints.length > 0)
    node.constraints = constraints;
  const child = {
    seen: new Map(frame.seen).set(raw, refName ?? name ?? "schema"),
    depth: frame.depth + 1,
    options: frame.options
  };
  const requiredNames = new Set(Array.isArray(schema.required) ? schema.required.filter((r) => typeof r === "string") : []);
  const properties = schema.properties;
  if (properties && typeof properties === "object") {
    node.properties = Object.entries(properties).map(([key, value]) => walk(value, key, requiredNames.has(key), child));
  }
  const declared = new Set(node.properties?.map((property) => property.name));
  const undeclared = [...requiredNames].filter((key) => !declared.has(key));
  if (undeclared.length > 0) {
    node.properties = [
      ...node.properties ?? [],
      ...undeclared.map((key) => ({ name: key, required: true, types: [] }))
    ];
  }
  const additional = schema.additionalProperties;
  if (typeof additional === "boolean") {
    node.allowsAdditionalProperties = additional;
  } else if (additional && typeof additional === "object") {
    node.allowsAdditionalProperties = true;
    node.additionalProperties = walk(additional, undefined, undefined, child);
  }
  const prefixItems = Array.isArray(schema.prefixItems) ? schema.prefixItems : undefined;
  const itemsIsTuple = Array.isArray(schema.items);
  const tuple = prefixItems ?? (itemsIsTuple ? schema.items : undefined);
  if (tuple && tuple.length > 0) {
    node.tupleItems = tuple.map((item, i) => walk(item, `[${i}]`, undefined, child));
  }
  if (!itemsIsTuple && schema.items !== undefined) {
    node.items = walk(schema.items, undefined, undefined, child);
  }
  const compositions = [];
  for (const kind of ["allOf", "oneOf", "anyOf"]) {
    const value = schema[kind];
    if (Array.isArray(value) && value.length > 0) {
      compositions.push({
        kind,
        options: value.map((option, i) => walk(option, `option ${i + 1}`, undefined, child))
      });
    }
  }
  if (schema.not !== undefined) {
    compositions.push({ kind: "not", options: [walk(schema.not, undefined, undefined, child)] });
  }
  if (compositions.length > 0)
    node.compositions = compositions;
  if (node.types.length === 0) {
    if (node.properties || node.additionalProperties)
      node.types = ["object"];
    else if (node.items || node.tupleItems)
      node.types = ["array"];
  }
  return node;
}
function toTypes(schema) {
  const type = schema.type;
  if (typeof type === "string")
    return [type];
  if (Array.isArray(type))
    return type.filter((t) => typeof t === "string");
  return [];
}
function toEnum(schema) {
  if (Array.isArray(schema.enum))
    return schema.enum;
  if ("const" in schema)
    return [schema.const];
  return;
}
function toExamples(schema) {
  if (Array.isArray(schema.examples))
    return schema.examples;
  if ("example" in schema)
    return [schema.example];
  return [];
}
function toConstraints(schema) {
  const out = [];
  for (const [key, label] of CONSTRAINT_KEYS) {
    const value = schema[key];
    if (value === undefined || value === null || value === false)
      continue;
    out.push({ label, value: String(value) });
  }
  return out;
}

// packages/core/src/formats/shared.ts
import $RefParser from "@apidevtools/json-schema-ref-parser";
async function dereferenceDocument(root, location, warnings) {
  const parser = new $RefParser;
  const base = location ?? `${process.cwd()}/`;
  try {
    const resolved = await parser.dereference(base, structuredClone(root), {
      continueOnError: true,
      dereference: { circular: true }
    });
    return resolved;
  } catch (error) {
    const partial = asRecord(parser.schema);
    const failures = resolutionFailures(error);
    if (!partial || failures.length === 0) {
      warnings.push(`No $refs could be resolved (${describeError(error)}). References are shown unresolved.`);
      return root;
    }
    for (const failure of failures) {
      warnings.push(`Could not resolve $ref at ${failure.path.join(".") || "(root)"}: ${failure.message}`);
      restoreRef(partial, root, failure);
    }
    return partial;
  }
}
function resolutionFailures(error) {
  if (typeof error !== "object" || error === null)
    return [];
  const group = error.errors;
  if (!Array.isArray(group))
    return [];
  return group.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null)
      return [];
    const failure = entry;
    if (!Array.isArray(failure.path))
      return [];
    return [
      {
        path: failure.path.map(String),
        message: describeError(failure.message)
      }
    ];
  });
}
function describeError(value) {
  const message = typeof value === "string" ? value : typeof value === "object" && value !== null && ("message" in value) ? String(value.message) : String(value);
  return message.split(`
`)[0] ?? "unknown error";
}
var UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function at(container, segment) {
  if (Array.isArray(container)) {
    const index = Number(segment);
    return Number.isInteger(index) ? container[index] : undefined;
  }
  return asRecord(container)?.[segment];
}
function setAt(container, segment, value) {
  if (Array.isArray(container)) {
    const index = Number(segment);
    if (!Number.isInteger(index) || index < 0 || index >= container.length)
      return false;
    container[index] = value;
    return true;
  }
  const record = asRecord(container);
  if (!record || UNSAFE_KEYS.has(segment))
    return false;
  Object.defineProperty(record, segment, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
  return true;
}
function restoreRef(target, original, failure) {
  const { path } = failure;
  if (path.length === 0)
    return;
  let parent = target;
  for (const segment of path.slice(0, -1)) {
    parent = at(parent, segment);
    if (parent === undefined || parent === null)
      return;
  }
  const key = path[path.length - 1];
  if (key === undefined)
    return;
  let source = original;
  for (const segment of path) {
    source = at(source, segment);
    if (source === undefined)
      break;
  }
  const originalRef = asRecord(source)?.$ref;
  const ref = typeof originalRef === "string" ? originalRef : targetOf(failure.message) ?? path.join("/");
  setAt(parent, key, { $ref: ref });
}
function targetOf(message) {
  return /(https?:\/\/\S+?)(?::\s|$)/.exec(message)?.[1];
}
function collectComponentNames(root) {
  const names = new Map;
  const schemas = asRecord(asRecord(root.components)?.schemas);
  if (!schemas)
    return names;
  for (const [name, schema] of Object.entries(schemas)) {
    if (typeof schema === "object" && schema !== null)
      names.set(schema, name);
  }
  return names;
}
function parseComponentSchemas(root, names) {
  const schemas = asRecord(asRecord(root.components)?.schemas);
  if (!schemas)
    return [];
  return Object.entries(schemas).map(([name, schema]) => normaliseSchema(schema, { names }, name)).filter((node) => Boolean(node));
}
function schemaNavigation(schemas) {
  if (schemas.length === 0)
    return;
  const childIds = new Set;
  return {
    id: "schemas",
    label: "Schemas",
    children: schemas.map((schema) => ({
      id: uniqueId(`schema-${slugify(schema.name ?? "schema")}`, childIds),
      label: schema.name ?? "Schema"
    }))
  };
}
function parseContact(raw) {
  const contact = asRecord(raw);
  if (!contact)
    return;
  return {
    name: asString(contact.name),
    url: asString(contact.url),
    email: asString(contact.email)
  };
}
function parseLicense(raw) {
  const license = asRecord(raw);
  const name = asString(license?.name);
  if (!license || !name)
    return;
  const identifier = asString(license.identifier);
  return {
    name,
    url: asString(license.url) ?? (identifier ? `https://spdx.org/licenses/${identifier}.html` : undefined)
  };
}
function parseExternalDocs(raw) {
  const docs = asRecord(raw);
  const url = asString(docs?.url);
  if (!docs || !url)
    return;
  return { url, description: asString(docs.description) };
}
function isExtensionKey(key) {
  return key.startsWith("x-");
}

// packages/core/src/formats/asyncapi/index.ts
async function parseAsyncApi(raw, options = {}) {
  const parser = new Parser;
  const { document, diagnostics } = await parser.parse(raw);
  const warnings = diagnostics.filter((d) => d.severity <= 1).map((d) => `${d.message}${d.path?.length ? ` (at ${d.path.join(".")})` : ""}`);
  if (!document) {
    throw new UnsupportedDocumentError(`The AsyncAPI document could not be parsed.${warnings.length ? ` ${warnings[0]}` : ""}`);
  }
  const info = document.info();
  const title = info.title() ?? "Untitled API";
  const version = info.version() ?? "0.0.0";
  const servers = document.servers().all().map((server) => ({
    name: server.id(),
    url: safe(() => server.url()) ?? server.host?.() ?? "",
    description: server.description(),
    protocol: server.protocol()
  }));
  const tags = document.info().tags().all().map((tag) => ({ name: tag.name(), description: tag.description() }));
  const taken = new Set;
  const operations = document.operations().all().map((operation) => {
    const channel = operation.channels().all()[0];
    const action = operation.action();
    return {
      id: uniqueId(slugify(operation.id() ?? `${action}-${channel?.id() ?? "channel"}`), taken),
      action: action === "send" || action === "publish" ? "send" : "receive",
      channelAddress: channel?.address() ?? channel?.id() ?? "",
      channelTitle: channel ? safe(() => readTitle(channel)) : undefined,
      summary: operation.summary(),
      description: operation.description(),
      parameters: channel ? parseChannelParameters(channel) : [],
      messages: operation.messages().all().map((message) => toMessageInfo(message))
    };
  });
  const schemas = document.components().schemas().all().map((schema) => normaliseSchema(schema.json(), {}, schema.id())).filter((node) => Boolean(node));
  return {
    id: options.id ?? slugify(title),
    kind: "asyncapi",
    specVersion: document.version(),
    title,
    version,
    description: info.description(),
    contact: parseContact(info.contact() ? {
      name: info.contact()?.name(),
      url: info.contact()?.url(),
      email: info.contact()?.email()
    } : undefined),
    license: info.license() ? { name: info.license()?.name() ?? "" } : undefined,
    servers,
    tags,
    operations,
    schemas,
    nav: buildNav(operations, schemas),
    warnings
  };
}
function readTitle(channel) {
  const titled = channel;
  return typeof titled.title === "function" ? titled.title() : undefined;
}
function parseChannelParameters(channel) {
  const parameters = safe(() => channel.parameters().all()) ?? [];
  return parameters.map((parameter) => ({
    name: parameter.id(),
    in: "path",
    description: safe(() => parameter.description()),
    required: true,
    schema: normaliseSchema(parameterSchema(parameter))
  }));
}
function parameterSchema(parameter) {
  const nested = safe(() => parameter.schema?.()?.json());
  return nested ?? safe(() => parameter.json());
}
function toMessageInfo(message) {
  return {
    name: message.id?.() ?? message.name?.() ?? "message",
    title: safe(() => message.title()),
    summary: safe(() => message.summary()),
    description: safe(() => message.description()),
    contentType: safe(() => message.contentType()),
    payload: normaliseSchema(safe(() => message.payload()?.json())),
    headers: normaliseSchema(safe(() => message.headers()?.json()))
  };
}
function safe(read) {
  try {
    return read();
  } catch {
    return;
  }
}
function buildNav(operations, schemas) {
  const nav = [];
  for (const action of ["receive", "send"]) {
    const group = operations.filter((operation) => operation.action === action);
    if (group.length === 0)
      continue;
    nav.push({
      id: `action-${action}`,
      label: action === "receive" ? "Receive" : "Send",
      children: group.map((operation) => ({
        id: operation.id,
        label: operation.summary ?? operation.channelTitle ?? operation.channelAddress,
        badge: action.toUpperCase(),
        badgeKind: action
      }))
    });
  }
  const schemasNode = schemaNavigation(schemas);
  if (schemasNode)
    nav.push(schemasNode);
  return nav;
}

// packages/core/src/formats/jsonrpc/index.ts
async function parseJsonRpc(raw, options = {}) {
  const root = asRecord(raw);
  if (!root)
    throw new UnsupportedDocumentError("Document is not an object.");
  const warnings = [];
  const dereferenced = await dereferenceDocument(root, options.location, warnings);
  const names = collectComponentNames(dereferenced);
  const info = asRecord(dereferenced.info) ?? {};
  const title = asString(info.title) ?? "Untitled API";
  const methods = parseMethods(dereferenced, names, warnings);
  const schemas = parseComponentSchemas(dereferenced, names);
  return {
    id: options.id ?? slugify(title),
    kind: "jsonrpc",
    specVersion: asString(dereferenced.openrpc) ?? "1.2.6",
    title,
    version: asString(info.version) ?? "0.0.0",
    description: asString(info.description),
    contact: parseContact(info.contact),
    license: parseLicense(info.license),
    servers: parseServers(dereferenced.servers),
    tags: collectTags(methods),
    methods,
    schemas,
    nav: buildNav2(methods, schemas),
    warnings
  };
}
function parseServers(raw) {
  return asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry)).map((entry) => ({
    name: asString(entry.name) ?? asString(entry.url) ?? "server",
    url: asString(entry.url) ?? "",
    description: asString(entry.summary) ?? asString(entry.description)
  }));
}
function parseMethods(root, names, warnings) {
  const rawMethods = asArray(root.methods);
  if (rawMethods.length === 0)
    warnings.push("The document declares no methods.");
  const taken = new Set;
  return rawMethods.map((entry) => asRecord(entry)).filter((entry) => Boolean(entry && asString(entry.name))).map((entry) => {
    const name = asString(entry.name);
    const result = asRecord(entry.result);
    return {
      id: uniqueId(slugify(name), taken),
      name,
      summary: asString(entry.summary),
      description: asString(entry.description),
      deprecated: entry.deprecated === true,
      tags: asArray(entry.tags).map((tag) => asString(asRecord(tag)?.name) ?? asString(tag)).filter((tag) => Boolean(tag)),
      paramStructure: toParamStructure(asString(entry.paramStructure)),
      params: parseParams(entry.params, names),
      result: result ? {
        name: asString(result.name) ?? "result",
        description: asString(result.description) ?? asString(result.summary),
        schema: normaliseSchema(result.schema, { names })
      } : undefined,
      errors: parseErrors(entry.errors, names),
      examples: parseExamples(entry.examples, toParamStructure(asString(entry.paramStructure)))
    };
  });
}
function toParamStructure(value) {
  return value === "by-name" || value === "by-position" ? value : "either";
}
function parseParams(raw, names) {
  return asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry && asString(entry.name))).map((entry) => ({
    name: asString(entry.name),
    description: asString(entry.description) ?? asString(entry.summary),
    required: entry.required === true,
    deprecated: entry.deprecated === true,
    schema: normaliseSchema(entry.schema, { names })
  }));
}
function parseErrors(raw, names) {
  return asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry)).map((entry) => ({
    code: typeof entry.code === "number" ? entry.code : 0,
    message: asString(entry.message) ?? "",
    description: asString(entry.description),
    schema: normaliseSchema(entry.data, { names })
  }));
}
function parseExamples(raw, structure) {
  return asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry)).map((entry) => {
    const params = asArray(entry.params).map((param) => {
      const record = asRecord(param);
      return record && "value" in record ? record.value : param;
    });
    const paramNames = asArray(entry.params).map((param) => asString(asRecord(param)?.name));
    const named = structure === "by-position" ? false : structure === "by-name" || paramNames.every(Boolean);
    const result = asRecord(entry.result);
    return {
      name: asString(entry.name) ?? "Example",
      description: asString(entry.description) ?? asString(entry.summary),
      params: named ? Object.fromEntries(paramNames.map((paramName, i) => [paramName, params[i]])) : params,
      result: result && "value" in result ? result.value : undefined
    };
  });
}
function collectTags(methods) {
  const seen = new Set;
  const tags = [];
  for (const method of methods) {
    for (const tag of method.tags) {
      if (seen.has(tag))
        continue;
      seen.add(tag);
      tags.push({ name: tag });
    }
  }
  return tags;
}
function buildNav2(methods, schemas) {
  const groups = new Map;
  for (const method of methods) {
    const tag = method.tags[0] ?? "Methods";
    const bucket = groups.get(tag);
    if (bucket)
      bucket.push(method);
    else
      groups.set(tag, [method]);
  }
  const groupIds = new Set;
  const nav = [...groups].map(([tag, tagMethods]) => ({
    id: uniqueId(`tag-${slugify(tag)}`, groupIds),
    label: tag,
    children: tagMethods.map((method) => ({
      id: method.id,
      label: method.name,
      badge: "RPC",
      badgeKind: "rpc",
      deprecated: method.deprecated
    }))
  }));
  const schemasNode = schemaNavigation(schemas);
  if (schemasNode)
    nav.push(schemasNode);
  return nav;
}

// packages/core/src/formats/openapi/index.ts
var METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];
async function parseOpenApi(raw, options = {}) {
  const root = asRecord(raw);
  if (!root)
    throw new UnsupportedDocumentError("Document is not an object.");
  if (asString(root.swagger)) {
    throw new UnsupportedDocumentError("Swagger 2.0 documents are not supported yet. Convert the document to OpenAPI 3.x " + "first \u2014 for example with `bunx swagger2openapi` \u2014 and open the result.");
  }
  const specVersion = asString(root.openapi) ?? "3.0.0";
  const warnings = [];
  const dereferenced = await dereferenceDocument(root, options.location, warnings);
  const names = collectComponentNames(dereferenced);
  const info = asRecord(dereferenced.info) ?? {};
  const title = asString(info.title) ?? "Untitled API";
  const version = asString(info.version) ?? "0.0.0";
  const tags = parseTags(dereferenced.tags);
  const servers = parseServers2(dereferenced.servers);
  const securitySchemes = parseSecuritySchemes(dereferenced);
  const operations = parseOperations(dereferenced, names, servers, warnings);
  const schemas = parseComponentSchemas(dereferenced, names);
  return {
    id: options.id ?? slugify(title),
    kind: "openapi",
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
    nav: buildNav3(operations, tags, schemas),
    warnings
  };
}
function parseTags(raw) {
  return asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry && asString(entry.name))).map((entry) => ({
    name: asString(entry.name),
    description: asString(entry.description),
    externalDocs: parseExternalDocs(entry.externalDocs)
  }));
}
function parseServers2(raw) {
  return asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry)).map((entry) => {
    const url = asString(entry.url) ?? "/";
    const variables = asRecord(entry.variables);
    return {
      name: url,
      url,
      description: asString(entry.description),
      variables: variables ? Object.entries(variables).map(([name, value]) => {
        const v = asRecord(value) ?? {};
        return {
          name,
          default: asString(v.default),
          description: asString(v.description),
          enum: asArray(v.enum).filter((e) => typeof e === "string")
        };
      }) : undefined
    };
  });
}
function parseSecurity(raw) {
  if (!Array.isArray(raw))
    return;
  return raw.map((entry) => {
    const record = asRecord(entry) ?? {};
    return {
      alternatives: Object.entries(record).map(([scheme, scopes]) => ({
        scheme,
        scopes: asArray(scopes).filter((s) => typeof s === "string")
      }))
    };
  });
}
function parseSecuritySchemes(root) {
  const schemes = asRecord(asRecord(root.components)?.securitySchemes);
  if (!schemes)
    return [];
  return Object.entries(schemes).map(([name, value]) => {
    const scheme = asRecord(value) ?? {};
    const flowsRecord = asRecord(scheme.flows);
    return {
      name,
      type: asString(scheme.type) ?? "unknown",
      description: asString(scheme.description),
      in: asString(scheme.in),
      paramName: asString(scheme.name),
      httpScheme: asString(scheme.scheme),
      bearerFormat: asString(scheme.bearerFormat),
      openIdConnectUrl: asString(scheme.openIdConnectUrl),
      flows: flowsRecord ? Object.entries(flowsRecord).map(([kind, flowValue]) => {
        const flow = asRecord(flowValue) ?? {};
        const scopes = asRecord(flow.scopes) ?? {};
        return {
          kind,
          authorizationUrl: asString(flow.authorizationUrl),
          tokenUrl: asString(flow.tokenUrl),
          refreshUrl: asString(flow.refreshUrl),
          scopes: Object.entries(scopes).map(([scopeName, description]) => ({
            name: scopeName,
            description: asString(description)
          }))
        };
      }) : undefined
    };
  });
}
function parseOperations(root, names, documentServers, warnings) {
  const paths = asRecord(root.paths);
  if (!paths) {
    warnings.push("The document declares no paths.");
    return [];
  }
  const taken = new Set;
  const operations = [];
  for (const [path, pathValue] of Object.entries(paths)) {
    const pathItem = asRecord(pathValue);
    if (!pathItem)
      continue;
    const sharedParameters = parseParameters(pathItem.parameters, names);
    const pathServers = parseServers2(pathItem.servers);
    for (const method of METHODS) {
      const operationValue = asRecord(pathItem[method]);
      if (!operationValue)
        continue;
      const operationId = asString(operationValue.operationId);
      const id = uniqueId(slugify(operationId ?? `${method}-${path}`), taken);
      const ownParameters = parseParameters(operationValue.parameters, names);
      const ownServers = parseServers2(operationValue.servers);
      operations.push({
        id,
        method: method.toUpperCase(),
        path,
        operationId,
        summary: asString(operationValue.summary),
        description: asString(operationValue.description),
        deprecated: operationValue.deprecated === true,
        tags: asArray(operationValue.tags).filter((t) => typeof t === "string"),
        servers: ownServers.length > 0 ? ownServers : pathServers.length > 0 ? pathServers : documentServers,
        externalDocs: parseExternalDocs(operationValue.externalDocs),
        parameters: mergeParameters(sharedParameters, ownParameters),
        requestBody: parseRequestBody(operationValue.requestBody, names),
        responses: parseResponses(operationValue.responses, names),
        security: parseSecurity(operationValue.security)
      });
    }
  }
  return operations;
}
function mergeParameters(shared, own) {
  const overridden = new Set(own.map((p) => `${p.in}:${p.name}`));
  return [...shared.filter((p) => !overridden.has(`${p.in}:${p.name}`)), ...own];
}
var PARAM_ORDER = ["path", "query", "header", "cookie"];
function parseParameters(raw, names) {
  const parsed = asArray(raw).map((entry) => asRecord(entry)).filter((entry) => Boolean(entry && asString(entry.name))).map((entry) => {
    const location = asString(entry.in) ?? "query";
    const { schema, content } = parseSchemaOrContent(entry, names);
    return {
      name: asString(entry.name),
      in: location,
      description: asString(entry.description),
      required: entry.required === true || location === "path",
      deprecated: entry.deprecated === true,
      schema,
      content,
      examples: parseExamples2(entry)
    };
  });
  return parsed.sort((a, b) => PARAM_ORDER.indexOf(a.in) - PARAM_ORDER.indexOf(b.in));
}
function parseRequestBody(raw, names) {
  const body = asRecord(raw);
  if (!body)
    return;
  return {
    description: asString(body.description),
    required: body.required === true,
    content: parseContent(body.content, names)
  };
}
function parseResponses(raw, names) {
  const responses = asRecord(raw);
  if (!responses)
    return [];
  return Object.entries(responses).filter(([status]) => !isExtensionKey(status)).map(([status, value]) => {
    const response = asRecord(value) ?? {};
    const headers = asRecord(response.headers);
    return {
      status,
      description: asString(response.description),
      headers: headers ? Object.entries(headers).map(([name, headerValue]) => {
        const header = asRecord(headerValue) ?? {};
        const { schema, content } = parseSchemaOrContent(header, names);
        return {
          name,
          description: asString(header.description),
          required: header.required === true,
          deprecated: header.deprecated === true,
          schema,
          content
        };
      }) : [],
      content: parseContent(response.content, names)
    };
  }).sort(compareStatus);
}
function compareStatus(a, b) {
  const rank = (status) => status === "default" ? Number.MAX_SAFE_INTEGER : Number.parseInt(status.replace(/X/gi, "0"), 10) || 0;
  return rank(a.status) - rank(b.status);
}
function parseSchemaOrContent(holder, names) {
  if (holder.schema !== undefined) {
    return { schema: normaliseSchema(holder.schema, { names }) };
  }
  const content = parseContent(holder.content, names);
  if (content.length === 0)
    return {};
  return { schema: content.length === 1 ? content[0]?.schema : undefined, content };
}
function parseContent(raw, names) {
  const content = asRecord(raw);
  if (!content)
    return [];
  return Object.entries(content).map(([contentType, value]) => {
    const media = asRecord(value) ?? {};
    return {
      contentType,
      schema: normaliseSchema(media.schema, { names }),
      examples: parseExamples2(media)
    };
  });
}
function parseExamples2(holder) {
  const out = [];
  const examples = asRecord(holder.examples);
  if (examples) {
    for (const [name, value] of Object.entries(examples)) {
      const example = asRecord(value);
      if (!example)
        continue;
      out.push({
        name,
        summary: asString(example.summary),
        description: asString(example.description),
        value: "value" in example ? example.value : undefined
      });
    }
  }
  if ("example" in holder && holder.example !== undefined) {
    out.push({ name: "Example", value: holder.example });
  }
  return out.length > 0 ? out : undefined;
}
function buildNav3(operations, tags, schemas) {
  const groups = new Map;
  for (const tag of tags)
    groups.set(tag.name, []);
  for (const operation of operations) {
    const tag = operation.tags[0] ?? "Other";
    const bucket = groups.get(tag);
    if (bucket)
      bucket.push(operation);
    else
      groups.set(tag, [operation]);
  }
  const nav = [];
  const groupIds = new Set;
  for (const [tag, tagOperations] of groups) {
    if (tagOperations.length === 0)
      continue;
    nav.push({
      id: uniqueId(`tag-${slugify(tag)}`, groupIds),
      label: tag,
      children: tagOperations.map((operation) => ({
        id: operation.id,
        label: operation.summary ?? `${operation.method} ${operation.path}`,
        badge: operation.method,
        badgeKind: operation.method.toLowerCase(),
        deprecated: operation.deprecated
      }))
    });
  }
  const schemasNode = schemaNavigation(schemas);
  if (schemasNode)
    nav.push(schemasNode);
  return nav;
}

// packages/core/src/parse.ts
async function parseApiDocument(raw, options = {}) {
  const detected = detectFormat(raw);
  if (!detected) {
    throw new UnsupportedDocumentError("Could not identify the document. Expected a root `openapi`, `asyncapi` or " + "`openrpc` version field.");
  }
  return parseDetected(raw, detected, options);
}
async function parseDetected(raw, detected, options) {
  switch (detected.format) {
    case "openapi":
      return parseOpenApi(raw, options);
    case "asyncapi":
      return parseAsyncApi(raw, options);
    case "jsonrpc":
      return parseJsonRpc(raw, options);
  }
}
async function loadApiDocument(location, options = {}) {
  const source = await loadSource(location);
  return parseApiDocument(source.raw, {
    location: options.location ?? source.location,
    id: options.id ?? slugify(source.name)
  });
}
// packages/core/src/validate.ts
var FORMATS = new Set(["openapi", "asyncapi", "jsonrpc"]);
// packages/cli/src/inputs.ts
import { isAbsolute, relative, resolve, sep } from "path";
import { glob } from "tinyglobby";
var GLOB_MAGIC = /[*?{[]/;
async function expandInputs(inputs, cwd) {
  const expanded = [];
  for (const input of inputs) {
    if (isUrl(input) || !GLOB_MAGIC.test(input)) {
      expanded.push(isUrl(input) ? input : resolve(cwd, input));
      continue;
    }
    const matches = await expandGlob(input, cwd);
    if (matches.length === 0)
      throw new Error(`Input pattern matched no files: ${input}`);
    expanded.push(...matches);
  }
  return [...new Set(expanded)];
}
function isUrl(input) {
  return /^https?:\/\//i.test(input);
}
async function expandGlob(input, cwd) {
  const pattern = isAbsolute(input) ? relative(cwd, input).split(sep).join("/") : input;
  const matches = await glob(pattern, { cwd, absolute: true, onlyFiles: true });
  return matches.sort((left, right) => left.localeCompare(right));
}

// packages/cli/src/build.ts
var DEFAULT_ASSET_DIRECTORY = fileURLToPath(new URL("../assets/viewer", import.meta.url));
var PACKAGE_JSON = fileURLToPath(new URL("../package.json", import.meta.url));
var BASE_MARKER = "<!-- apibox:base -->";
var TITLE_MARKER = "<!-- apibox:title -->";
async function buildSite(options) {
  if (options.inputs.length === 0)
    throw new Error("Provide at least one API specification.");
  const cwd = options.cwd ?? process.cwd();
  const outDir = resolve2(cwd, options.outDir);
  const sources = await expandInputs(options.inputs, cwd);
  const documents = await loadDocuments(sources);
  const manifest = createManifest(documents, options.generator ?? await generatorName(), options.title, options.generatedAt);
  await cp(options.assetDir ?? DEFAULT_ASSET_DIRECTORY, outDir, {
    recursive: true,
    force: true
  });
  await mkdir(resolve2(outDir, "data"), { recursive: true });
  await Promise.all(documents.map((document) => writeJson(resolve2(outDir, "data", `${document.id}.json`), document)));
  await writeJson(resolve2(outDir, "data", "manifest.json"), manifest);
  await rewriteIndex(resolve2(outDir, "index.html"), options.title ?? "apibox", options.base ?? "./");
  return { outDir, manifest };
}
async function loadDocuments(sources) {
  const takenIds = new Set;
  const documents = [];
  for (const source of sources) {
    const document = await loadApiDocument(source);
    const id = uniqueId(document.id, takenIds);
    documents.push(id === document.id ? document : { ...document, id });
  }
  return documents;
}
function createManifest(documents, generator, title = "API documentation", generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    title,
    generatedAt,
    generator,
    documents: documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      title: document.title,
      version: document.version,
      summary: document.summary,
      path: `${document.id}.json`
    }))
  };
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}
`, "utf8");
}
async function rewriteIndex(path, title, base) {
  const html = await readFile2(path, "utf8");
  if (!html.includes(BASE_MARKER) || !html.includes(TITLE_MARKER)) {
    throw new Error("The prebuilt viewer is missing its apibox HTML template markers.");
  }
  const baseTag = `<base href="${escapeHtml(normaliseBase(base))}" />`;
  const rewritten = html.replace(BASE_MARKER, baseTag).replace(`<title>${TITLE_MARKER}apibox</title>`, `<title>${escapeHtml(title)}</title>`);
  await writeFile(path, rewritten, "utf8");
}
async function generatorName() {
  const packageJson = JSON.parse(await readFile2(PACKAGE_JSON, "utf8"));
  if (typeof packageJson !== "object" || packageJson === null || !("version" in packageJson) || typeof packageJson.version !== "string") {
    throw new Error("The CLI package metadata does not contain a valid version.");
  }
  return `apibox/${packageJson.version}`;
}
function normaliseBase(base) {
  if (base === "" || base === ".")
    return "./";
  if (base.endsWith("/") || base.endsWith("#"))
    return base;
  return `${base}/`;
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
// packages/cli/src/cli.ts
import { mkdir as mkdir2, writeFile as writeFile2 } from "fs/promises";
import { dirname as dirname2, resolve as resolve4 } from "path";

// packages/cli/src/config.ts
import { access } from "fs/promises";
import { resolve as resolve3 } from "path";
import { pathToFileURL } from "url";
var CONFIG_FILENAMES = [
  "apibox.config.ts",
  "apibox.config.mts",
  "apibox.config.js",
  "apibox.config.mjs"
];
async function loadConfig(cwd) {
  for (const filename of CONFIG_FILENAMES) {
    const path = resolve3(cwd, filename);
    if (!await exists(path))
      continue;
    const module = await import(`${pathToFileURL(path).href}?t=${Date.now()}`);
    if (!isConfig(module.default))
      throw new Error(`${filename} does not export a valid config.`);
    return module.default;
  }
  return;
}
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT")
      return false;
    throw error;
  }
}
function isConfig(value) {
  return typeof value === "object" && value !== null && "inputs" in value && Array.isArray(value.inputs) && value.inputs.every((input) => typeof input === "string") && "out" in value && typeof value.out === "string" && (!("title" in value) || value.title === undefined || typeof value.title === "string") && (!("base" in value) || value.base === undefined || typeof value.base === "string");
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}

// packages/cli/src/cli.ts
var HELP = `Usage:
  apibox build <inputs...> [--out ./site] [--title "API docs"] [--base ./]
  apibox init [path]
`;
var CONSOLE_IO = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message)
};
async function runCli(args, io = CONSOLE_IO, cwd = process.cwd()) {
  try {
    const [command, ...rest] = args;
    if (!command || command === "--help" || command === "-h") {
      io.stdout(HELP);
      return 0;
    }
    if (command === "build")
      return await runBuild(rest, io, cwd);
    if (command === "init")
      return await runInit(rest, io, cwd);
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
async function runBuild(args, io, cwd) {
  const parsed = parseBuildArguments(args);
  const config = await loadConfig(cwd);
  const result = await buildSite({
    cwd,
    inputs: parsed.inputs.length > 0 ? parsed.inputs : config?.inputs ?? [],
    outDir: parsed.outDir ?? config?.out ?? "./site",
    title: parsed.title ?? config?.title,
    base: parsed.base ?? config?.base
  });
  io.stdout(`Built ${result.manifest.documents.length} document(s) in ${result.outDir}`);
  return 0;
}
async function runInit(args, io, cwd) {
  if (args.length > 1)
    throw new Error("The init command accepts at most one path.");
  const path = resolve4(cwd, args[0] ?? "apibox.config.ts");
  await mkdir2(dirname2(path), { recursive: true });
  await writeFile2(path, `import type { ApiBoxConfig } from 'apibox';

export default {
  inputs: ['examples/*.yaml'],
  out: './site',
  title: 'API documentation',
  base: './',
} satisfies ApiBoxConfig;
`, { encoding: "utf8", flag: "wx" });
  io.stdout(`Created ${path}`);
  return 0;
}
function parseBuildArguments(args) {
  const inputs = [];
  let outDir;
  let title;
  let base;
  for (let index = 0;index < args.length; index += 1) {
    const argument = args[index];
    if (argument === undefined)
      break;
    if (!argument.startsWith("-")) {
      inputs.push(argument);
      continue;
    }
    const [flag, inlineValue] = argument.split("=", 2);
    if (!["--out", "--title", "--base"].includes(flag ?? "")) {
      throw new Error(`Unknown option: ${flag}`);
    }
    const value = inlineValue ?? args[++index];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${flag}`);
    if (flag === "--out")
      outDir = value;
    if (flag === "--title")
      title = value;
    if (flag === "--base")
      base = value;
  }
  return { inputs, outDir, title, base };
}
export {
  buildSite,
  runCli
};
