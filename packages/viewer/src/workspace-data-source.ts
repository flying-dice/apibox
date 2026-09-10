import type { ApiDocument, Manifest } from '@apibox/core/browser';
import { toManifestEntry } from '@apibox/core/browser';
import type { DataSource } from './data-source.js';
import type { WorkspaceController } from './workspace.js';

export class WorkspaceDataSource implements DataSource {
  constructor(
    private readonly controller: WorkspaceController,
    private readonly examples: DataSource,
  ) {}

  async loadManifest(): Promise<Manifest> {
    await this.controller.initialise();
    const workspace = this.controller.activeWorkspace();
    if (!workspace) return this.examples.loadManifest();
    return {
      schemaVersion: 1,
      title: workspace.name,
      generatedAt: workspace.updatedAt,
      generator: 'apibox/browser',
      documents: workspace.files.map(({ document }) => toManifestEntry(document)),
    };
  }

  async loadDocument(id: string): Promise<ApiDocument> {
    await this.controller.initialise();
    const workspace = this.controller.activeWorkspace();
    if (!workspace) return this.examples.loadDocument(id);
    const document = workspace.files.find((file) => file.document.id === id)?.document;
    if (!document) throw new Error(`Document '${id}' is not in the active workspace.`);
    return document;
  }
}
