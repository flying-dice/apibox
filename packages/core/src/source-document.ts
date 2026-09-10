import { parseDocument } from './document.js';
import { type ParseOptions, parseApiDocument } from './parse.js';
import type { ApiDocument } from './types.js';

/** Parse and normalize an API description supplied as JSON or YAML text. */
export function parseApiSource(text: string, options: ParseOptions = {}): Promise<ApiDocument> {
  return parseApiDocument(parseDocument(text), options);
}
