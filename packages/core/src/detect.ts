import type { FormatId } from './types.js';
import { asRecord, asString } from './utils.js';

export interface DetectionResult {
  format: FormatId;
  /** The version string declared by the document, e.g. `3.1.0`. */
  specVersion: string;
}

export interface DetectionHints {
  /**
   * Caller-declared format — `ParseOptions.format`, or a CLI `--format` flag. Takes
   * precedence over every other signal, which is what makes JSON Schema detectable at all
   * for a document that omits `$schema`: the reader who names the file explicitly is
   * trusted in a way a glob match never can be.
   */
  format?: FormatId;
}

/**
 * Map a `$schema` value to the short dialect string the model stores as `specVersion`.
 *
 * Matched tolerantly — http or https, an optional trailing `#` — because real-world
 * documents vary on both and the two are not a meaningful distinction to a reader.
 * `undefined` means the value was present but not one of the five dialects apibox
 * understands, which callers must treat as "unrecognised", not "absent".
 */
const DIALECTS: Array<[pattern: RegExp, version: string]> = [
  [/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema#?$/, '2020-12'],
  [/^https?:\/\/json-schema\.org\/draft\/2019-09\/schema#?$/, '2019-09'],
  [/^https?:\/\/json-schema\.org\/draft-07\/schema#?$/, 'draft-07'],
  [/^https?:\/\/json-schema\.org\/draft-06\/schema#?$/, 'draft-06'],
  [/^https?:\/\/json-schema\.org\/draft-04\/schema#?$/, 'draft-04'],
];

export function jsonSchemaDialect(schemaUri: string | undefined): string | undefined {
  if (!schemaUri) return undefined;
  for (const [pattern, version] of DIALECTS) {
    if (pattern.test(schemaUri.trim())) return version;
  }
  return undefined;
}

/** The `specVersion` a hinted or root-marker format would report, recomputed per format. */
function markerSpecVersion(doc: Record<string, unknown>, format: FormatId): string {
  switch (format) {
    case 'openapi':
      return asString(doc.openapi) ?? asString(doc.swagger) ?? '';
    case 'asyncapi':
      return asString(doc.asyncapi) ?? '';
    case 'jsonrpc':
      return asString(doc.openrpc) ?? '';
    case 'jsonschema':
      // Unrecognised or absent: the parser is responsible for warning and defaulting, not
      // this function — detection only decides *which* parser runs.
      return jsonSchemaDialect(asString(doc.$schema)) ?? '';
  }
}

/**
 * Identify a document from its content rather than its filename.
 *
 * Filenames are unreliable — `api.yaml` says nothing, and users rename things — but every
 * one of these formats is required to carry a version marker at the root, or (JSON Schema
 * only) is opted into explicitly. Precedence: an explicit hint, then the existing root
 * version markers, then a recognised `$schema` dialect.
 */
export function detectFormat(
  raw: unknown,
  hints: DetectionHints = {},
): DetectionResult | undefined {
  const doc = asRecord(raw);
  if (!doc) return undefined;

  if (hints.format)
    return { format: hints.format, specVersion: markerSpecVersion(doc, hints.format) };

  const openapi = asString(doc.openapi);
  if (openapi) return { format: 'openapi', specVersion: openapi };

  const asyncapi = asString(doc.asyncapi);
  if (asyncapi) return { format: 'asyncapi', specVersion: asyncapi };

  const openrpc = asString(doc.openrpc);
  if (openrpc) return { format: 'jsonrpc', specVersion: openrpc };

  // Swagger 2.0 is detected so that we can fail with a useful message instead of
  // "unrecognised document".
  const swagger = asString(doc.swagger);
  if (swagger) return { format: 'openapi', specVersion: swagger };

  // Unlike the markers above, every JSON object is technically a valid JSON Schema, so
  // this only fires for a *recognised* dialect URI. An absent or unrecognised `$schema`
  // must fall through to "undetected" — see decisions/08-json-schema-as-fourth-format.md.
  const dialect = jsonSchemaDialect(asString(doc.$schema));
  if (dialect) return { format: 'jsonschema', specVersion: dialect };

  return undefined;
}

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedDocumentError';
  }
}
