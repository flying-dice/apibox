import type { ApiDocument, Manifest } from '@apibox/core';
import { toManifestEntry } from '@apibox/core';
import type { HostToViewerMessage } from '@apibox/viewer/protocol';

export function manifestMessage(document: ApiDocument): HostToViewerMessage {
  const manifest: Manifest = {
    schemaVersion: 1,
    title: document.title,
    generatedAt: new Date().toISOString(),
    generator: 'apibox-vscode',
    documents: [toManifestEntry(document)],
  };
  return { type: 'apibox/manifest', manifest };
}
