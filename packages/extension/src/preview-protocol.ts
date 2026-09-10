import type { ApiDocument, Manifest } from '@apibox/core';
import type { HostToViewerMessage } from '@apibox/viewer/protocol';

export function manifestMessage(document: ApiDocument): HostToViewerMessage {
  const manifest: Manifest = {
    schemaVersion: 1,
    title: document.title,
    generatedAt: new Date().toISOString(),
    generator: 'apibox-vscode',
    documents: [
      {
        id: document.id,
        kind: document.kind,
        title: document.title,
        version: document.version,
        summary: document.summary,
        path: `${document.id}.json`,
      },
    ],
  };
  return { type: 'apibox/manifest', manifest };
}
