import type { ApiDocument, ManifestEntry as CoreManifestEntry, Manifest } from '@apibox/core';

export type DocumentManifest = Manifest;
export type ManifestEntry = CoreManifestEntry;

export interface DataSource {
  loadManifest(): Promise<DocumentManifest>;
  loadDocument(id: string): Promise<ApiDocument>;
  dispose?(): void;
}
