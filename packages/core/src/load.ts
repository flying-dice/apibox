import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseDocument } from './document.js';
import { sourceName } from './source-name.js';

export interface LoadedSource {
  /** Absolute path or URL, used as the base for resolving relative `$ref`s. */
  location: string;
  /** Filename without extension, used as the fallback document id. */
  name: string;
  raw: unknown;
}

/** Read and parse a spec from a local path or an http(s) URL. YAML or JSON. */
export async function loadSource(location: string): Promise<LoadedSource> {
  const isUrl = /^https?:\/\//i.test(location);
  const text = isUrl ? await fetchText(location) : await readFile(location, 'utf8');
  const name = deriveName(location);

  try {
    return { location, name, raw: parseDocument(text) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${location}: ${message}`, { cause: error });
  }
}

/**
 * Parse a spec from a string.
 *
 * YAML 1.2 is a superset of JSON, so one parser handles both. We try `JSON.parse` first
 * only because its errors are clearer for genuinely broken JSON.
 */
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function deriveName(location: string): string {
  const withoutQuery = location.split(/[?#]/)[0] ?? location;
  const base = basename(withoutQuery);
  return sourceName(base);
}
