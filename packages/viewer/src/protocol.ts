import type { ApiDocument } from '@apibox/core';
import { isApiDocument, isManifest } from '@apibox/core/validate';
import type { DocumentManifest } from './data-source.js';

export type ViewerToHostMessage =
  | { type: 'apibox/loadManifest' }
  | { type: 'apibox/loadDocument'; documentId: string };

export type HostToViewerMessage =
  | { type: 'apibox/manifest'; manifest: DocumentManifest }
  | { type: 'apibox/document'; documentId: string; document: ApiDocument }
  | { type: 'apibox/error'; request: 'manifest'; message: string }
  | { type: 'apibox/error'; request: 'document'; documentId: string; message: string };

export interface VsCodeApi {
  postMessage(message: ViewerToHostMessage): void;
}

export interface WebviewBootstrap {
  manifest?: DocumentManifest;
  documents?: Record<string, ApiDocument>;
}

export function isViewerToHostMessage(value: unknown): value is ViewerToHostMessage {
  if (!isRecord(value)) return false;
  return (
    value.type === 'apibox/loadManifest' ||
    (value.type === 'apibox/loadDocument' && typeof value.documentId === 'string')
  );
}

export function isHostToViewerMessage(value: unknown): value is HostToViewerMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'apibox/manifest') return isManifest(value.manifest);
  if (value.type === 'apibox/document') {
    return typeof value.documentId === 'string' && isApiDocument(value.document, value.documentId);
  }
  if (value.type !== 'apibox/error' || typeof value.message !== 'string') return false;
  return (
    value.request === 'manifest' ||
    (value.request === 'document' && typeof value.documentId === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
