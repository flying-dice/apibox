import type { ApiDocument, ManifestEntry } from './types.js';

/** Project a normalized API document into its portable manifest entry. */
export function toManifestEntry(
  document: ApiDocument,
  path = `${document.id}.json`,
): ManifestEntry {
  return {
    id: document.id,
    kind: document.kind,
    title: document.title,
    version: document.version,
    summary: document.summary,
    path,
  };
}
