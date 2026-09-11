import { type DetectionResult, detectFormat, UnsupportedDocumentError } from './detect.js';
import { parseAsyncApi } from './formats/asyncapi/index.js';
import { parseJsonRpc } from './formats/jsonrpc/index.js';
import { parseJsonSchema } from './formats/jsonschema/index.js';
import { parseOpenApi } from './formats/openapi/index.js';
import { type LoadedSource, loadSource } from './load.js';
import type { ApiDocument, FormatId } from './types.js';
import { slugify } from './utils.js';

export interface ParseOptions {
  /**
   * Document id, used as the URL slug and the data filename. Defaults to a slug of the
   * source filename, falling back to the document title.
   */
  id?: string;
  /** Base path or URL for resolving relative `$ref`s. */
  location?: string;
  /**
   * Force the format rather than detecting it. This is the only way to parse a JSON
   * Schema document that omits `$schema` — see
   * decisions/08-json-schema-as-fourth-format.md for why there is no heuristic fallback.
   */
  format?: FormatId;
}

/**
 * Parse a raw specification object into the normalised model.
 *
 * The format is identified from the document's own version marker, so a caller never has
 * to say which format it is passing — unless it is a JSON Schema document with no
 * `$schema`, which requires `options.format`.
 */
export async function parseApiDocument(
  raw: unknown,
  options: ParseOptions = {},
): Promise<ApiDocument> {
  const detected = detectFormat(raw, { format: options.format });
  if (!detected) {
    throw new UnsupportedDocumentError(
      'Could not identify the document. Expected a root `openapi`, `asyncapi`, `openrpc` ' +
        'or recognised `$schema` version field, or an explicit `format` option.',
    );
  }
  return parseDetected(raw, detected, options);
}

async function parseDetected(
  raw: unknown,
  detected: DetectionResult,
  options: ParseOptions,
): Promise<ApiDocument> {
  switch (detected.format) {
    case 'openapi':
      return parseOpenApi(raw, options);
    case 'asyncapi':
      return parseAsyncApi(raw, options);
    case 'jsonrpc':
      return parseJsonRpc(raw, options);
    case 'jsonschema':
      return parseJsonSchema(raw, options);
  }
}

/** Load a spec from a path or URL and parse it. */
export async function loadApiDocument(
  location: string,
  options: ParseOptions = {},
): Promise<ApiDocument> {
  const source: LoadedSource = await loadSource(location);
  return parseApiDocument(source.raw, {
    location: options.location ?? source.location,
    id: options.id ?? slugify(source.name),
    format: options.format,
  });
}
