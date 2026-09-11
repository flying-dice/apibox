import $RefParser from '@apidevtools/json-schema-ref-parser';
import { normaliseSchema } from '../schema.js';
import type { Contact, ExternalDocs, License, NavNode, SchemaNode } from '../types.js';
import { asRecord, asString, slugify, uniqueId } from '../utils.js';

/**
 * Helpers shared by the format parsers.
 *
 * OpenAPI and OpenRPC both keep reusable schemas under `components.schemas` and both need
 * the same dereference-then-recover-names treatment, so that logic lives here rather than
 * being maintained twice.
 */

export interface DereferenceOptions {
  /**
   * How to handle a genuinely circular `$ref` (as opposed to one that is merely broken).
   *
   * `true` (the default) inlines it into a real cyclic object graph, which is what
   * {@link normaliseSchema} is built to walk — this is what OpenAPI and OpenRPC want.
   *
   * `'ignore'` leaves a circular `$ref` exactly as authored instead of inlining it. AsyncAPI
   * wants this: `@asyncapi/parser` does its own resolution afterwards and already handles
   * circular refs correctly on its own, but a native cyclic JS object handed to it as
   * *input* makes its (JSON-based) validation step throw — so a circular ref must survive
   * this pass as a plain `$ref` for the caller to hand onward unresolved, not inlined.
   */
  circular?: boolean | 'ignore';
  /**
   * Called once per `$ref` this pass could not resolve, in addition to the warning already
   * pushed to `warnings`. AsyncAPI uses this to find exactly which paths need substituting
   * with something `@asyncapi/parser` can parse, without touching any other `$ref` in the
   * document — including a legitimate circular one left in place by `circular: 'ignore'`.
   */
  onUnresolved?: (path: string[], ref: string) => void;
}

/**
 * Resolve every `$ref` in a document.
 *
 * Resolution runs with `continueOnError` so that one unreachable external document costs
 * the reader only that reference. Abandoning the whole pass would leave every *internal*
 * `$ref` unresolved too, which in a typical spec means the entire document renders as
 * unresolved markers — a far worse outcome than the one broken link.
 *
 * Each failure is reported as a warning, and the original `$ref` is written back at the
 * path that failed so it renders as an explicit unresolved marker rather than as `null`.
 */
export async function dereferenceDocument(
  root: Record<string, unknown>,
  location: string | undefined,
  warnings: string[],
  options: DereferenceOptions = {},
): Promise<Record<string, unknown>> {
  const parser = new $RefParser();
  const processLike = (globalThis as { process?: { cwd?: () => string } }).process;
  const base = location ?? (processLike?.cwd ? `${processLike.cwd()}/` : 'https://apibox.local/');
  try {
    const resolved = await parser.dereference(base, structuredClone(root) as never, {
      continueOnError: true,
      dereference: { circular: options.circular ?? true },
    });
    // `dereference` is typed as returning a JSONSchema, which permits a boolean. A
    // specification document is always an object, so narrow through `unknown`.
    return resolved as unknown as Record<string, unknown>;
  } catch (error) {
    // With `continueOnError`, individual failures are collected and thrown as a group at
    // the end, while `parser.schema` holds everything that did resolve.
    // A boolean is a valid JSON Schema, so `parser.schema` is not necessarily an object.
    const partial = asRecord(parser.schema);
    const failures = resolutionFailures(error);

    if (!partial || failures.length === 0) {
      warnings.push(
        `No $refs could be resolved (${describeError(error)}). References are shown unresolved.`,
      );
      return root;
    }

    for (const failure of failures) {
      warnings.push(
        `Could not resolve $ref at ${failure.path.join('.') || '(root)'}: ${failure.message}`,
      );
      const ref = restoreRef(partial, root, failure);
      if (ref) options.onUnresolved?.(failure.path, ref);
    }
    return partial;
  }
}

interface ResolutionFailure {
  /** Location of the failed reference, as path segments. Array indices appear as strings. */
  path: string[];
  message: string;
}

/**
 * Flatten a `JSONParserErrorGroup` into the individual references that failed.
 *
 * Defensive about the error's shape: this runs inside a `catch`, so throwing here would
 * replace a recoverable parse failure with an unhandled one.
 */
function resolutionFailures(error: unknown): ResolutionFailure[] {
  if (typeof error !== 'object' || error === null) return [];
  const group = (error as { errors?: unknown }).errors;
  if (!Array.isArray(group)) return [];

  return group.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const failure = entry as { path?: unknown; message?: unknown };
    if (!Array.isArray(failure.path)) return [];
    return [
      {
        path: failure.path.map(String),
        message: describeError(failure.message),
      },
    ];
  });
}

/** First line of an error message, tolerant of a non-`Error` being thrown. */
function describeError(value: unknown): string {
  const message =
    typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null && 'message' in value
        ? String((value as { message: unknown }).message)
        : String(value);
  return message.split('\n')[0] ?? 'unknown error';
}

/**
 * Keys that must never be written through, because assigning to them mutates a prototype
 * rather than the object. Specification documents are untrusted input — a schema property
 * really can be named `__proto__`.
 */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Read one path segment from an object or an array. */
export function at(container: unknown, segment: string): unknown {
  if (Array.isArray(container)) {
    const index = Number(segment);
    return Number.isInteger(index) ? container[index] : undefined;
  }
  return asRecord(container)?.[segment];
}

/** Write one path segment into an object or an array. Returns false if it could not. */
export function setAt(container: unknown, segment: string, value: unknown): boolean {
  if (Array.isArray(container)) {
    const index = Number(segment);
    if (!Number.isInteger(index) || index < 0 || index >= container.length) return false;
    container[index] = value;
    return true;
  }
  const record = asRecord(container);
  if (!record || UNSAFE_KEYS.has(segment)) return false;
  // `defineProperty` rather than assignment, so an inherited setter cannot intercept it.
  Object.defineProperty(record, segment, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return true;
}

/**
 * Put a `$ref`-shaped value back where resolution failed.
 *
 * The parser leaves `null` at a failed reference, which would normalise to an untyped
 * property and lose the fact that something was meant to be there. The original `$ref` is
 * preferred, but it is not always available — a reference that failed inside a *nested*
 * external document has no counterpart in the root — so fall back to whatever identifies
 * the target, ensuring the location is never left as a bare `null`.
 */
function restoreRef(
  target: Record<string, unknown>,
  original: Record<string, unknown>,
  failure: ResolutionFailure,
): string | undefined {
  const { path } = failure;
  if (path.length === 0) return undefined;

  let parent: unknown = target;
  for (const segment of path.slice(0, -1)) {
    parent = at(parent, segment);
    if (parent === undefined || parent === null) return undefined;
  }

  const key = path[path.length - 1];
  if (key === undefined) return undefined;

  let source: unknown = original;
  for (const segment of path) {
    source = at(source, segment);
    if (source === undefined) break;
  }

  const originalRef = asRecord(source)?.$ref;
  const ref =
    typeof originalRef === 'string' ? originalRef : (targetOf(failure.message) ?? path.join('/'));
  setAt(parent, key, { $ref: ref });
  return ref;
}

/** Pull the URL or file path out of a resolver error message, when it names one. */
function targetOf(message: string): string | undefined {
  return /(https?:\/\/\S+?)(?::\s|$)/.exec(message)?.[1];
}

/**
 * Map each dereferenced component schema object back to its component name.
 *
 * After dereferencing, a `$ref: '#/components/schemas/Pet'` is replaced by the very same
 * object that lives under `components.schemas.Pet`, so object identity is enough to recover
 * the name — and recovering it is what lets the UI render `Pet` instead of an anonymous
 * blob.
 */
export function collectComponentNames(root: Record<string, unknown>): Map<object, string> {
  const names = new Map<object, string>();
  const schemas = asRecord(asRecord(root.components)?.schemas);
  if (!schemas) return names;
  for (const [name, schema] of Object.entries(schemas)) {
    if (typeof schema === 'object' && schema !== null) names.set(schema, name);
  }
  return names;
}

/** Normalise everything under `components.schemas`, preserving declaration order. */
export function parseComponentSchemas(
  root: Record<string, unknown>,
  names: Map<object, string>,
): SchemaNode[] {
  const schemas = asRecord(asRecord(root.components)?.schemas);
  if (!schemas) return [];
  return Object.entries(schemas)
    .map(([name, schema]) => normaliseSchema(schema, { names }, name))
    .filter((node): node is SchemaNode => Boolean(node));
}

/** Build the common terminal navigation group for named component schemas. */
export function schemaNavigation(schemas: SchemaNode[]): NavNode | undefined {
  if (schemas.length === 0) return undefined;
  const childIds = new Set<string>();
  return {
    id: 'schemas',
    label: 'Schemas',
    children: schemas.map((schema) => ({
      id: uniqueId(`schema-${slugify(schema.name ?? 'schema')}`, childIds),
      label: schema.name ?? 'Schema',
    })),
  };
}

export function parseContact(raw: unknown): Contact | undefined {
  const contact = asRecord(raw);
  if (!contact) return undefined;
  return {
    name: asString(contact.name),
    url: asString(contact.url),
    email: asString(contact.email),
  };
}

export function parseLicense(raw: unknown): License | undefined {
  const license = asRecord(raw);
  const name = asString(license?.name);
  if (!license || !name) return undefined;
  // OpenAPI 3.1 allows an SPDX `identifier` instead of a `url`.
  const identifier = asString(license.identifier);
  return {
    name,
    url:
      asString(license.url) ??
      (identifier ? `https://spdx.org/licenses/${identifier}.html` : undefined),
  };
}

export function parseExternalDocs(raw: unknown): ExternalDocs | undefined {
  const docs = asRecord(raw);
  const url = asString(docs?.url);
  if (!docs || !url) return undefined;
  return { url, description: asString(docs.description) };
}

/**
 * True for a specification extension key.
 *
 * Extensions may appear anywhere in a document, including inside maps whose keys we
 * otherwise treat as meaningful — `responses` being the one that bites, since an
 * `x-internal` key would otherwise be rendered as an HTTP status.
 */
export function isExtensionKey(key: string): boolean {
  return key.startsWith('x-');
}
