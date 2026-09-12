import type { Composition, SchemaConstraint, SchemaNode, XmlInfo } from './types.js';
import { asRecord, asString } from './utils.js';

/**
 * `$comment` and `$vocabulary` are deliberately never read here.
 *
 * `$comment` is author-facing by spec design ("MUST NOT be used to convey information to
 * consumers") -- surfacing it to a reader would show them a note the spec explicitly says
 * is not for them. `$vocabulary` declares which keyword vocabularies a meta-schema requires
 * or permits and whether each is optional; apibox is a renderer, not a validator, so it
 * neither enforces nor needs to track vocabulary membership -- there is no reader-facing
 * fact this would add beyond "this document mentions vocabularies", which is not useful
 * without also implementing vocabulary-aware validation. Both are genuinely absent from the
 * model, not a silent drop: this comment is that decision's record.
 */

/**
 * Keywords rendered as constraint chips rather than as structure, in the order they
 * should appear. `format` leads because it is the one readers scan for.
 */
const CONSTRAINT_KEYS: Array<[key: string, label: string]> = [
  ['format', 'format'],
  ['pattern', 'pattern'],
  ['minLength', 'min length'],
  ['maxLength', 'max length'],
  // `minimum`/`maximum` and their exclusive counterparts are handled separately, by
  // `boundConstraints` below — draft-04 spells the exclusive flag as a boolean qualifying
  // the bound, not a value in its own right, so they cannot be stringified generically.
  ['multipleOf', 'multiple of'],
  ['minItems', 'min items'],
  ['maxItems', 'max items'],
  ['uniqueItems', 'unique items'],
  ['minContains', 'min contains'],
  ['maxContains', 'max contains'],
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
  const mappedName = frame.options.names?.get(raw as object);
  // `names` maps a dereferenced object back to its component name so an inlined `$ref`
  // can be labelled with what it points to. At the root of a walk that name is instead
  // this schema's *own* definition -- e.g. walking `definitions.Address` finds "Address"
  // mapped to itself -- so using it as `refName` there would just echo the heading the
  // catalog already shows. Suppress only that self-referential case; a nested schema
  // whose identity matches a named component (a genuine inlined `$ref`) keeps its label.
  const refName = frame.depth === 0 && mappedName === name ? undefined : mappedName;

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
  // draft-04 spells the identifier `id`; 2019-09+ uses `$id`. Read at every node, not only
  // the document root, so a bundle's per-`$defs` `$id` is not lost -- see the doc comment
  // on `SchemaNode.schemaId`.
  const schemaId = asString(schema.$id) ?? asString(schema.id);
  if (schemaId) node.schemaId = schemaId;
  const anchor = asString(schema.$anchor);
  if (anchor) node.anchor = anchor;
  const dynamicRef = asString(schema.$dynamicRef);
  if (dynamicRef) node.dynamicRef = dynamicRef;
  const dynamicAnchor = asString(schema.$dynamicAnchor);
  if (dynamicAnchor) node.dynamicAnchor = dynamicAnchor;
  const contentEncoding = asString(schema.contentEncoding);
  if (contentEncoding) node.contentEncoding = contentEncoding;
  const contentMediaType = asString(schema.contentMediaType);
  if (contentMediaType) node.contentMediaType = contentMediaType;
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

  // `if`/`then`/`else` describe a conditional, not an alternative to pick from — kept as
  // its own field rather than folded into `compositions`, so a reader is never told "one of
  // these" about branches that are not actually alternatives.
  if (schema.if !== undefined) {
    node.conditional = {
      if: walk(schema.if, undefined, undefined, child),
      // biome-ignore lint/suspicious/noThenProperty: mirrors the JSON Schema keyword `then`; never awaited or dynamically imported.
      then: schema.then !== undefined ? walk(schema.then, undefined, undefined, child) : undefined,
      else: schema.else !== undefined ? walk(schema.else, undefined, undefined, child) : undefined,
    };
  }

  const patternProperties = asRecord(schema.patternProperties);
  if (patternProperties) {
    const entries = Object.entries(patternProperties);
    if (entries.length > 0) {
      node.patternProperties = entries.map(([pattern, value]) => ({
        pattern,
        schema: walk(value, undefined, undefined, child),
      }));
    }
  }

  if (schema.propertyNames !== undefined) {
    node.propertyNames = walk(schema.propertyNames, undefined, undefined, child);
  }

  if (schema.contains !== undefined) {
    node.contains = walk(schema.contains, undefined, undefined, child);
  }

  // `contentSchema` describes the shape of the *decoded* content named by
  // `contentMediaType` (e.g. a base64 field whose decoded bytes are themselves JSON) -- it
  // nests like `propertyNames`/`contains` above rather than living in `constraints`.
  if (schema.contentSchema !== undefined) {
    node.contentSchema = walk(schema.contentSchema, undefined, undefined, child);
  }

  const dependentRequired = asRecord(schema.dependentRequired);
  if (dependentRequired) {
    const entries = Object.entries(dependentRequired)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([property, requires]) => ({
        property,
        requires: requires.filter((r): r is string => typeof r === 'string'),
      }));
    if (entries.length > 0) node.dependentRequired = entries;
  }

  const dependentSchemas = asRecord(schema.dependentSchemas);
  if (dependentSchemas) {
    const entries = Object.entries(dependentSchemas);
    if (entries.length > 0) {
      node.dependentSchemas = entries.map(([property, value]) => ({
        property,
        schema: walk(value, undefined, undefined, child),
      }));
    }
  }

  // `unevaluatedProperties`/`unevaluatedItems` follow the same open/closed/typed shape as
  // `additionalProperties` — a boolean, or a schema constraining whatever was not already
  // accounted for by `properties`/`patternProperties`/`items`/composition.
  const unevaluatedProperties = schema.unevaluatedProperties;
  if (typeof unevaluatedProperties === 'boolean') {
    node.allowsUnevaluatedProperties = unevaluatedProperties;
  } else if (unevaluatedProperties && typeof unevaluatedProperties === 'object') {
    node.allowsUnevaluatedProperties = true;
    node.unevaluatedProperties = walk(unevaluatedProperties, undefined, undefined, child);
  }

  const unevaluatedItems = schema.unevaluatedItems;
  if (typeof unevaluatedItems === 'boolean') {
    node.allowsUnevaluatedItems = unevaluatedItems;
  } else if (unevaluatedItems && typeof unevaluatedItems === 'object') {
    node.allowsUnevaluatedItems = true;
    node.unevaluatedItems = walk(unevaluatedItems, undefined, undefined, child);
  }

  // `x-*` specification extensions. Captured wherever a schema carries one, not only at a
  // document root, since a schema is routinely reused and re-read independent of its
  // document — see `isExtensionKey` in formats/shared.ts for the same rule applied there.
  const extensionEntries = Object.entries(schema).filter(([key]) => key.startsWith('x-'));
  if (extensionEntries.length > 0) {
    node.extensions = extensionEntries.map(([key, value]) => ({ key, value }));
  }

  const xml = toXml(schema.xml);
  if (xml) node.xml = xml;

  const discriminator = asRecord(schema.discriminator);
  const propertyName = asString(discriminator?.propertyName);
  if (discriminator && propertyName) {
    const mapping = asRecord(discriminator.mapping);
    node.discriminator = {
      propertyName,
      mapping: mapping
        ? Object.entries(mapping).map(([value, target]) => {
            const targetString = asString(target) ?? String(target);
            return {
              value,
              target: targetString,
              resolvedName: resolveDiscriminatorTarget(targetString, frame.options.names),
            };
          })
        : undefined,
    };
  }

  // A schema with properties but no declared type is an object in all but name.
  if (node.types.length === 0) {
    if (node.properties || node.additionalProperties) node.types = ['object'];
    else if (node.items || node.tupleItems) node.types = ['array'];
  }

  return node;
}

/**
 * Resolve a discriminator mapping target to the component name it names.
 *
 * OpenAPI permits `mapping` values to be either a bare component name (`Cat`) or a `$ref`
 * pointer (`#/components/schemas/Cat`) — both spellings are legal, and a pointer's final
 * path segment is the candidate name either way. `names` maps dereferenced schema *objects*
 * to their component name, not name strings to names, so there is no cheaper lookup than
 * checking membership; mapping lists are short in practice.
 */
function resolveDiscriminatorTarget(
  target: string,
  names: Map<object, string> | undefined,
): string | undefined {
  if (!names) return undefined;
  const candidate = target.includes('/') ? target.split('/').pop() : target;
  if (!candidate) return undefined;
  for (const name of names.values()) {
    if (name === candidate) return name;
  }
  return undefined;
}

/** Parse the `xml` keyword: `undefined` unless the document declared at least one field. */
function toXml(raw: unknown): XmlInfo | undefined {
  const xml = asRecord(raw);
  if (!xml) return undefined;
  const info: XmlInfo = {
    name: asString(xml.name),
    namespace: asString(xml.namespace),
    prefix: asString(xml.prefix),
    attribute: xml.attribute === true ? true : undefined,
    wrapped: xml.wrapped === true ? true : undefined,
    nodeType: asString(xml.nodeType),
  };
  const hasAny = Object.values(info).some((value) => value !== undefined);
  return hasAny ? info : undefined;
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
  out.push(...pushBound(schema, 'minimum', 'exclusiveMinimum', 'min'));
  out.push(...pushBound(schema, 'maximum', 'exclusiveMaximum', 'max'));
  for (const [key, label] of CONSTRAINT_KEYS) {
    const value = schema[key];
    if (value === undefined || value === null || value === false) continue;
    out.push({ label, value: String(value) });
  }
  return out;
}

/**
 * `minimum`/`maximum` bound chips, accounting for the exclusive flag changing shape between
 * drafts: draft-04 spells `exclusiveMinimum`/`exclusiveMaximum` as a boolean qualifying
 * `minimum`/`maximum`, so `exclusiveMinimum: true` alone renders nothing and `minimum: 0` on
 * its own says "min: 0" rather than the meaningless "exclusive min: true". Draft-06 onward
 * spells them as standalone numbers, which render as their own chip alongside the bound.
 * Read by the value's actual runtime type rather than a declared dialect, since a document's
 * declared dialect and its keyword shapes are not guaranteed to agree.
 */
function pushBound(
  schema: Record<string, unknown>,
  boundKey: 'minimum' | 'maximum',
  exclusiveKey: 'exclusiveMinimum' | 'exclusiveMaximum',
  label: string,
): SchemaConstraint[] {
  const bound = schema[boundKey];
  const exclusive = schema[exclusiveKey];
  const hasBound = bound !== undefined && bound !== null;

  if (typeof exclusive === 'boolean') {
    if (!hasBound) return [];
    return [{ label: exclusive ? `exclusive ${label}` : label, value: String(bound) }];
  }

  const out: SchemaConstraint[] = [];
  if (hasBound) out.push({ label, value: String(bound) });
  if (typeof exclusive === 'number')
    out.push({ label: `exclusive ${label}`, value: String(exclusive) });
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
