import type { FormatId } from './types.js';
import { asRecord, asString } from './utils.js';

export interface DetectionResult {
  format: FormatId;
  /** The version string declared by the document, e.g. `3.1.0`. */
  specVersion: string;
}

/**
 * Identify a document from its content rather than its filename.
 *
 * Filenames are unreliable — `api.yaml` says nothing, and users rename things — but every
 * one of these formats is required to carry a version marker at the root.
 */
export function detectFormat(raw: unknown): DetectionResult | undefined {
  const doc = asRecord(raw);
  if (!doc) return undefined;

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

  return undefined;
}

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedDocumentError';
  }
}
