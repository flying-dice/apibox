import type { ApiDocument } from '@apibox/core';
import { isApiDocument, isManifest } from '@apibox/core/validate';
import type { DataSource, DocumentManifest } from './data-source.js';

export class StaticDataSource implements DataSource {
  #manifest?: DocumentManifest;

  constructor(
    private readonly baseUrl = '.',
    private readonly fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}

  async loadManifest(): Promise<DocumentManifest> {
    if (this.#manifest) return this.#manifest;
    const value = await this.#loadJson('data/manifest.json');
    if (!isManifest(value))
      throw new Error('The site manifest is invalid or uses an unsupported schema version.');
    this.#manifest = value;
    return this.#manifest;
  }

  async loadDocument(id: string): Promise<ApiDocument> {
    const manifest = await this.loadManifest();
    const entry = manifest.documents.find((document) => document.id === id);
    if (!entry) throw new Error(`Document '${id}' is not listed in the manifest.`);
    const value = await this.#loadJson(`data/${entry.path}`);
    if (!isApiDocument(value, id))
      throw new Error(`Document '${id}' is not a valid normalized API document.`);
    return value;
  }

  async #loadJson(path: string): Promise<unknown> {
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/${path}`);
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    return response.json();
  }
}
