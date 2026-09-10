import type { Composition, SchemaConstraint, SchemaNode } from './types.js';
import { asString } from './utils.js';

/**
 * Keywords rendered as constraint chips rather than as structure, in the order they
 * should appear. `format` leads because it is the one readers scan for.
 */
const CONSTRAINT_KEYS: Array<[key: string, label: string]> = [
  ['format', 'format'],
  ['pattern', 'pattern'],
  ['minLength', 'min length'],
  ['maxLength', 'max length'],
  ['minimum', 'min'],
  ['maximum', 'max'],
  ['exclusiveMinimum', 'exclusive min'],
  ['exclusiveMaximum', 'exclusive max'],
  ['multipleOf', 'multiple of'],
  ['minItems', 'min items'],
  ['maxItems', 'max items'],
  ['uniqueItems', 'unique items'],
  ['minProperties', 'min properties'],
  ['maxProperties', 'max properties'],
];

export interface NormaliseSchemaOptions {
  /**
   * Maps a dereferenced schema object back to the component name it came from. Built by
   * the format parsers after dereferencing, so that inlined `$ref` targets can still be
   * labelled `Pet` instead of rendering as an anonymous object.
   */
  names?: Map<object, string>;
  /** Guards against pathological specs. Nodes deeper than this render as a stub. */
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 12;

interface Frame {
  /** Ancestors by object identity, mapped to a label used for the circular back-link. */
  seen: Map<object, string>;
  depth: number;
  options: NormaliseSchemaOptions;
}

/**
 * Convert a dereferenced JSON Schema into a {@link SchemaNode} tree.
 *
 * The input is expected to already be free of `$ref` — the format parsers dereference
 * first. Dereferencing turns recursive schemas into genuinely cyclic object graphs, so
 * every descent checks ancestry by object identity and stops at a back-reference.
 */
export function normaliseSchema(
  raw: unknown,
  options: NormaliseSchemaOptions = {},
  name?: string,
  required?: boolean,
): SchemaNode | undefined {
  if (raw === undefined || raw === null) return undefined;
  return walk(raw, name, required, {
    seen: new Map(),
    depth: 0,
    options,
  });
}

function walk(
  raw: unknown,
  name: string | undefined,
  required: boolean | undefined,
  frame: Frame,
): SchemaNode {
  // `true` and `false` are valid schemas: anything, and nothing.
  if (typeof raw === 'boolean') {
    return { name, required, types: raw ? [] : ['never'] };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { name, required, types: [] };
  }

  const schema = raw as Record<string, unknown>;
  const refName = frame.options.names?.get(raw as object);

  // A `$ref` still present here means dereferencing failed for it — a broken external URL,
  // typically. Render it as an explicit unresolved marker rather than an empty schema,
  // which would look like the document genuinely described nothing.
  const unresolvedRef = typeof schema.$ref === 'string' ? schema.$ref : undefined;
  if (unresolvedRef) {
    return {
      name,
      required,
      unresolvedRef,
      refName: refName ?? unresolvedRef.split('/').pop(),
      types: [],
      description: asString(schema.description),
    };
  }

  const back = frame.seen.get(raw as object);
  if (back !== undefined) {
    return {
      name,
      required,
      refName,
      types: toTypes(schema),
      description: asString(schema.description),
      circularRef: back,
    };
  }

  if (frame.depth >= (frame.options.maxDepth ?? DEFAULT_MAX_DEPTH)) {
    return {
      name,
      required,
      refName,
      types: toTypes(schema),
      description: asString(schema.description),
      circularRef: refName ?? name ?? 'schema',
    };
  }

  const node: SchemaNode = {
    name,
    required,
    refName,
    title: asString(schema.title),
    types: toTypes(schema),
    description: asString(schema.description),
  };

  const format = asString(schema.format);
  if (format) node.format = format;
  if (schema.deprecated === true) node.deprecated = true;
  if (schema.readOnly === true) node.readOnly = true;
  if (schema.writeOnly === true) node.writeOnly = true;
  if (schema.nullable === true || node.types.includes('null')) node.nullable = true;
  if ('default' in schema) node.default = schema.default;

  const enumValues = toEnum(schema);
  if (enumValues) node.enum = enumValues;

  const examples = toExamples(schema);
  if (examples.length > 0) node.examples = examples;

  const constraints = toConstraints(schema);
  if (constraints.length > 0) node.constraints = constraints;

  // Descend. The node itself becomes an ancestor for everything below it.
  const child: Frame = {
    seen: new Map(frame.seen).set(raw as object, refName ?? name ?? 'schema'),
    depth: frame.depth + 1,
    options: frame.options,
  };

  const requiredNames = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((r): r is string => typeof r === 'string')
      : [],
  );

  const properties = schema.properties;
  if (properties && typeof properties === 'object') {
    node.properties = Object.entries(properties as Record<string, unknown>).map(([key, value]) =>
      walk(value, key, requiredNames.has(key), child),
    );
  }

  // A name in `required` with no entry in `properties` is legal and means "this key must be
  // present, with any value". Without a placeholder the requirement would vanish from the
  // rendered table entirely.
  const declared = new Set(node.properties?.map((property) => property.name));
  const undeclared = [...requiredNames].filter((key) => !declared.has(key));
  if (undeclared.length > 0) {
    node.properties = [
      ...(node.properties ?? []),
      ...undeclared.map((key) => ({ name: key, required: true, types: [] })),
    ];
  }

  // `false` (closed) and absent (unspecified, therefore permissive) must stay distinct:
  // a reader needs to know which one the document actually said.
  const additional = schema.additionalProperties;
  if (typeof additional === 'boolean') {
    node.allowsAdditionalProperties = additional;
  } else if (additional && typeof additional === 'object') {
    node.allowsAdditionalProperties = true;
    node.additionalProperties = walk(additional, undefined, undefined, child);
  }

  // Draft-4 spells tuples as an array-valued `items`; 2020-12 uses `prefixItems` and
  // reserves `items` for the entries beyond the tuple. Keep every position either way —
  // taking only the first would silently retype the rest of the tuple.
  const prefixItems = Array.isArray(schema.prefixItems) ? schema.prefixItems : undefined;
  const itemsIsTuple = Array.isArray(schema.items);
  const tuple = prefixItems ?? (itemsIsTuple ? (schema.items as unknown[]) : undefined);
  if (tuple && tuple.length > 0) {
    node.tupleItems = tuple.map((item, i) => walk(item, `[${i}]`, undefined, child));
  }
  if (!itemsIsTuple && schema.items !== undefined) {
    node.items = walk(schema.items, undefined, undefined, child);
  }

  // A schema may carry several composition keywords at once — `allOf` for a mixin plus
  // `oneOf` for a variant is a common pattern — so collect them all rather than the first.
  const compositions: Composition[] = [];
  for (const kind of ['allOf', 'oneOf', 'anyOf'] as const) {
    const value = schema[kind];
    if (Array.isArray(value) && value.length > 0) {
      compositions.push({
        kind,
        options: value.map((option, i) => walk(option, `option ${i + 1}`, undefined, child)),
      });
    }
  }
  if (schema.not !== undefined) {
    compositions.push({ kind: 'not', options: [walk(schema.not, undefined, undefined, child)] });
  }
  if (compositions.length > 0) node.compositions = compositions;

  // A schema with properties but no declared type is an object in all but name.
  if (node.types.length === 0) {
    if (node.properties || node.additionalProperties) node.types = ['object'];
    else if (node.items || node.tupleItems) node.types = ['array'];
  }

  return node;
}

function toTypes(schema: Record<string, unknown>): string[] {
  const type = schema.type;
  if (typeof type === 'string') return [type];
  if (Array.isArray(type)) return type.filter((t): t is string => typeof t === 'string');
  return [];
}

function toEnum(schema: Record<string, unknown>): unknown[] | undefined {
  if (Array.isArray(schema.enum)) return schema.enum;
  if ('const' in schema) return [schema.const];
  return undefined;
}

function toExamples(schema: Record<string, unknown>): unknown[] {
  // OpenAPI 3.0 spells it `example`; JSON Schema and OpenAPI 3.1 use `examples`.
  if (Array.isArray(schema.examples)) return schema.examples;
  if ('example' in schema) return [schema.example];
  return [];
}

function toConstraints(schema: Record<string, unknown>): SchemaConstraint[] {
  const out: SchemaConstraint[] = [];
  for (const [key, label] of CONSTRAINT_KEYS) {
    const value = schema[key];
    if (value === undefined || value === null || value === false) continue;
    out.push({ label, value: String(value) });
  }
  return out;
}

/** Append any union members other than `array` to an array or tuple label. */
function withUnion(label: string, node: SchemaNode): string {
  const others = node.types.filter((type) => type !== 'array');
  return others.length > 0 ? [label, ...others].join(' | ') : label;
}

/**
 * A short, one-line rendering of a schema's type, for table cells and nav rows:
 * `string`, `Pet[]`, `integer | null`, `oneOf`.
 */
export function schemaTypeLabel(node: SchemaNode | undefined): string {
  if (!node) return 'any';
  // An array may itself be part of a union, e.g. `type: ['array', 'null']`. Label the array
  // shape, then append whatever else the union accepts, so nullability is not lost.
  if (node.tupleItems) {
    return withUnion(`[${node.tupleItems.map(schemaTypeLabel).join(', ')}]`, node);
  }
  if (node.types.includes('array') && node.items) {
    const inner = schemaTypeLabel(node.items);
    // Parenthesise a union so `(string | null)[]` cannot be misread as `string | (null[])`.
    return withUnion(inner.includes(' | ') ? `(${inner})[]` : `${inner}[]`, node);
  }
  if (node.refName) return node.refName;
  if (node.types.length > 0) return node.types.join(' | ');
  if (node.compositions?.[0]) return node.compositions[0].kind;
  return 'any';
}
