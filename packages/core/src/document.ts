import { parse as parseYaml } from 'yaml';

/** Parse a JSON or YAML specification string without reading from a filesystem. */
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
