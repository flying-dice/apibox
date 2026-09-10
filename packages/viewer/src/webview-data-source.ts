import type { ApiDocument } from '@apibox/core';
import { isApiDocument, isManifest } from '@apibox/core/validate';
import type { DataSource, DocumentManifest } from './data-source.js';
import type { VsCodeApi, WebviewBootstrap } from './protocol.js';
import { isHostToViewerMessage } from './protocol.js';

interface Pending<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: Error): void;
}

function createPending<T>(): Pending<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export class WebviewDataSource implements DataSource {
  #manifest?: DocumentManifest;
  readonly #documents = new Map<string, ApiDocument>();
  #pendingManifest?: Pending<DocumentManifest>;
  readonly #pendingDocuments = new Map<string, Pending<ApiDocument>>();
  readonly #onMessage = (event: MessageEvent<unknown>) => this.#receive(event.data);

  constructor(
    private readonly vscode: VsCodeApi,
    private readonly messageTarget: Pick<
      Window,
      'addEventListener' | 'removeEventListener'
    > = window,
    bootstrap: WebviewBootstrap = {},
  ) {
    if (isManifest(bootstrap.manifest)) this.#manifest = bootstrap.manifest;
    for (const document of Object.values(bootstrap.documents ?? {})) {
      if (isApiDocument(document)) this.#documents.set(document.id, document);
    }
    this.messageTarget.addEventListener('message', this.#onMessage as EventListener);
  }

  loadManifest(): Promise<DocumentManifest> {
    if (this.#manifest) return Promise.resolve(this.#manifest);
    if (this.#pendingManifest) return this.#pendingManifest.promise;
    this.#pendingManifest = createPending<DocumentManifest>();
    this.vscode.postMessage({ type: 'apibox/loadManifest' });
    return this.#pendingManifest.promise;
  }

  loadDocument(id: string): Promise<ApiDocument> {
    const cached = this.#documents.get(id);
    if (cached) return Promise.resolve(cached);
    const pending = this.#pendingDocuments.get(id);
    if (pending) return pending.promise;
    const pendingDocument = createPending<ApiDocument>();
    this.#pendingDocuments.set(id, pendingDocument);
    this.vscode.postMessage({ type: 'apibox/loadDocument', documentId: id });
    return pendingDocument.promise;
  }

  dispose(): void {
    this.messageTarget.removeEventListener('message', this.#onMessage as EventListener);
  }

  #receive(value: unknown): void {
    if (!isHostToViewerMessage(value)) {
      this.#rejectMalformedResponse(value);
      return;
    }
    const message = value;
    if (message.type === 'apibox/manifest') {
      this.#manifest = message.manifest;
      this.#pendingManifest?.resolve(message.manifest);
      this.#pendingManifest = undefined;
      return;
    }
    if (message.type === 'apibox/document') {
      const pending = this.#pendingDocuments.get(message.documentId);
      if (!pending) return;
      this.#documents.set(message.documentId, message.document);
      pending.resolve(message.document);
      this.#pendingDocuments.delete(message.documentId);
      return;
    }
    const error = new Error(message.message);
    if (message.request === 'manifest') {
      this.#pendingManifest?.reject(error);
      this.#pendingManifest = undefined;
    } else {
      this.#pendingDocuments.get(message.documentId)?.reject(error);
      this.#pendingDocuments.delete(message.documentId);
    }
  }

  #rejectMalformedResponse(value: unknown): void {
    if (typeof value !== 'object' || value === null || !('type' in value)) return;
    const message = value as Record<string, unknown>;
    if (message.type === 'apibox/manifest') {
      this.#pendingManifest?.reject(new Error('The extension returned an invalid site manifest.'));
      this.#pendingManifest = undefined;
    } else if (message.type === 'apibox/document' && typeof message.documentId === 'string') {
      this.#pendingDocuments
        .get(message.documentId)
        ?.reject(new Error('The extension returned an invalid API document.'));
      this.#pendingDocuments.delete(message.documentId);
    }
  }
}
