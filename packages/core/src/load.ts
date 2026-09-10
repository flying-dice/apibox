import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { parse as parseYaml } from 'yaml';

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
export function parseDocument(text: string): unknown {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      // Fall through: it may be YAML flow style, which JSON.parse rejects.
    }
  }
  return parseYaml(text, { merge: true });
}

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
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  // `petstore.openapi.yaml` reads better as `petstore`.
  return stem.replace(/\.(openapi|asyncapi|openrpc|jsonrpc|api|spec)$/i, '') || 'api';
}
