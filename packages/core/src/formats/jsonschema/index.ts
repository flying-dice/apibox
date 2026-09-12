import { jsonSchemaDialect, UnsupportedDocumentError } from '../../detect.js';
import { normaliseSchema } from '../../schema.js';
import type { JsonSchemaDocument, NavNode, SchemaNode } from '../../types.js';
import { asRecord, asString, slugify } from '../../utils.js';
import { dereferenceDocument, schemaNavigation } from '../shared.js';

/**
 * `$vocabulary`: which keyword vocabularies the document's meta-schema requires (`true`) or
 * merely permits (`false`), by URI. Read directly here rather than through `normaliseSchema`
 * -- see `schema.ts`'s doc comment on `$comment`/`$vocabulary` for why the two keywords get
 * different treatment.
 */
function parseVocabulary(raw: unknown): Array<{ uri: string; mandatory: boolean }> | undefined {
  const vocabulary = asRecord(raw);
  if (!vocabulary) return undefined;
  const entries = Object.entries(vocabulary)
    .filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
    .map(([uri, mandatory]) => ({ uri, mandatory }));
  return entries.length > 0 ? entries : undefined;
}

export interface ParseJsonSchemaOptions {
  id?: string;
  location?: string;
}

/**
 * Keys that describe the document as a container rather than as a schema in its own
 * right. A document consisting only of these has no root schema to show — see
 * `hasRootContent` below.
 */
// `$comment` is deliberately NOT listed here, even though it was before this keyword was
// modelled: it is now genuine schema content (see `SchemaNode.comment`), not container
// metadata, so a document whose only content beyond `$schema`/`$defs` is a `$comment`
// must still get a root schema to carry it -- `$vocabulary`, by contrast, is exactly the
// kind of document-shape metadata this set exists to name.
const CONTAINER_KEYS = new Set(['$schema', '$id', 'id', '$defs', 'definitions', '$vocabulary']);

/** The dialect assumed when `$schema` is missing or not one apibox recognises. */
const DEFAULT_DIALECT = '2020-12';

/**
 * Parse a standalone JSON Schema document — a form schema, a config schema, anything not
 * embedded in one of the API description formats.
 *
 * Detection for this format is explicit-signal only (see
 * decisions/08-json-schema-as-fourth-format.md), so by the time this runs the document has
 * either declared a recognised `$schema` or the caller opted in directly. Either way, the
 * dialect is re-derived here rather than trusted from detection, matching how every other
 * format parser re-reads its own version marker instead of the `DetectionResult`.
 */
export async function parseJsonSchema(
  raw: unknown,
  options: ParseJsonSchemaOptions = {},
): Promise<JsonSchemaDocument> {
  // A bare boolean (`true`/`false` as the entire document) is a legal whole JSON Schema
  // per spec, and `normaliseSchema`/`walk()` already handles a boolean correctly at any
  // *nested* position. It is not handled here, and deliberately not fixed: `detectFormat`
  // (`../../detect.ts`) requires `asRecord(raw)` before it even looks at an explicit
  // `format` hint, so no caller -- not even one passing `--format jsonschema` through
  // `parseApiDocument`/`loadApiDocument` -- can reach this function with a boolean at all.
  // This function is also not exported from the package's public surface. Loosening the
  // check here would add an untested code path nothing can exercise; the actual gate to
  // revisit, if this is ever prioritised, is `detectFormat`'s, not this one.
  const root = asRecord(raw);
  if (!root) throw new UnsupportedDocumentError('Document is not an object.');

  const warnings: string[] = [];
  const dereferenced = await dereferenceDocument(root, options.location, warnings);

  const declaredDialect = asString(dereferenced.$schema);
  const dialect = jsonSchemaDialect(declaredDialect);
  if (declaredDialect && !dialect) {
    warnings.push(
      `Unrecognised $schema dialect "${declaredDialect}". Treating it as ${DEFAULT_DIALECT}.`,
    );
  } else if (!declaredDialect) {
    warnings.push(`No $schema dialect declared. Treating it as ${DEFAULT_DIALECT}.`);
  }
  const specVersion = dialect ?? DEFAULT_DIALECT;

  const definitionEntries = collectDefinitionEntries(dereferenced);
  const names = collectDefinitionNames(definitionEntries);

  const hasRoot = hasRootContent(dereferenced);
  if (!hasRoot && definitionEntries.length === 0) {
    warnings.push('The document declares neither a root schema nor any $defs/definitions.');
  }

  const rootNode = hasRoot ? normaliseSchema(dereferenced, { names }) : undefined;
  // `description` below is promoted from this same root schema onto the document. Leaving
  // it on the root node too would render it twice — once in DocumentHeader, once in the
  // root's own SchemaViewer row — and that row's `description` is one of the conditions
  // that forces SchemaViewer to draw the root at all (see SchemaViewer's `showRoot`),
  // so the leftover description also drags a redundant `object` summary line along with
  // it. Composition, `$ref` markers and childless roots still force that row on their own
  // merits, so stripping only `description` here cannot make a document render empty.
  if (rootNode) delete rootNode.description;
  // The root's own `$id` is promoted to `schemaId` below (same reasoning as `description`
  // above: rendering it both on the document header and again on the root's own property
  // row would show the same value twice). A nested `$defs`/`definitions` entry's `$id` is
  // unaffected -- it is not the document root, so `walk()`'s own `schemaId` stays put there.
  if (rootNode) delete rootNode.schemaId;
  const schemas = definitionEntries
    .map(([name, schema]) => normaliseSchema(schema, { names }, name))
    .filter((node): node is SchemaNode => Boolean(node));

  const title = asString(dereferenced.title) ?? options.id ?? 'Untitled schema';
  // draft-04 spells the identifier `id`; 2019-09+ uses `$id`.
  const schemaId = asString(dereferenced.$id) ?? asString(dereferenced.id);

  return {
    id: options.id ?? slugify(title),
    kind: 'jsonschema',
    specVersion,
    // Detection forces $schema to be present (or the caller opted in explicitly), so the
    // dialect is a genuine document-declared version — see types.ts on JsonSchemaDocument.
    version: specVersion,
    title,
    description: asString(dereferenced.description),
    schemaId,
    root: rootNode,
    schemas,
    vocabulary: parseVocabulary(dereferenced.$vocabulary),
    servers: [],
    tags: [],
    nav: buildNav(rootNode, schemas),
    warnings,
  };
}

/** True when the document describes a schema of its own, beyond being a `$defs` wrapper. */
function hasRootContent(root: Record<string, unknown>): boolean {
  return Object.keys(root).some((key) => !CONTAINER_KEYS.has(key));
}

/**
 * Collect `$defs` and `definitions` entries, in that order. Both are read regardless of
 * declared dialect — real documents mix conventions more than the spec admits — and a
 * schema object present under both keys is only counted once.
 */
function collectDefinitionEntries(root: Record<string, unknown>): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  const seen = new Set<unknown>();
  for (const key of ['$defs', 'definitions'] as const) {
    const defs = asRecord(root[key]);
    if (!defs) continue;
    for (const [name, schema] of Object.entries(defs)) {
      if (seen.has(schema)) continue;
      seen.add(schema);
      entries.push([name, schema]);
    }
  }
  return entries;
}

/**
 * Map each `$defs`/`definitions` schema object back to its declared name, the same
 * identity trick `collectComponentNames` uses for `components.schemas` — after
 * dereferencing, a `$ref` target is the very same object as the named entry.
 */
function collectDefinitionNames(entries: Array<[string, unknown]>): Map<object, string> {
  const names = new Map<object, string>();
  for (const [name, schema] of entries) {
    if (typeof schema === 'object' && schema !== null) names.set(schema, name);
  }
  return names;
}

function buildNav(root: SchemaNode | undefined, schemas: SchemaNode[]): NavNode[] {
  const nav: NavNode[] = [];
  if (root) nav.push({ id: 'root', label: 'Schema' });
  const schemasNode = schemaNavigation(schemas);
  // "Schemas" is tautological in a schema-only document; $defs/definitions is JSON
  // Schema's own term, and the sidebar must agree with SchemaCatalog's section heading.
  if (schemasNode) nav.push({ ...schemasNode, label: 'Definitions' });
  return nav;
}
