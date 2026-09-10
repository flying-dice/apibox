import { type DetectionResult, detectFormat, UnsupportedDocumentError } from './detect.js';
import { parseAsyncApi } from './formats/asyncapi/index.js';
import { parseJsonRpc } from './formats/jsonrpc/index.js';
import { parseOpenApi } from './formats/openapi/index.js';
import { type LoadedSource, loadSource } from './load.js';
import type { ApiDocument } from './types.js';
import { slugify } from './utils.js';

export interface ParseOptions {
  /**
   * Document id, used as the URL slug and the data filename. Defaults to a slug of the
   * source filename, falling back to the document title.
   */
  id?: string;
  /** Base path or URL for resolving relative `$ref`s. */
  location?: string;
}

/**
 * Parse a raw specification object into the normalised model.
 *
 * The format is identified from the document's own version marker, so a caller never has
 * to say which format it is passing.
 */
export async function parseApiDocument(
  raw: unknown,
  options: ParseOptions = {},
): Promise<ApiDocument> {
  const detected = detectFormat(raw);
  if (!detected) {
    throw new UnsupportedDocumentError(
      'Could not identify the document. Expected a root `openapi`, `asyncapi` or ' +
        '`openrpc` version field.',
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
  });
}
