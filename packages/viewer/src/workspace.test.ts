import { describe, expect, it } from 'vitest';
import type { DataSource } from './data-source.js';
import { DOCUMENT, MANIFEST } from './test-fixtures.js';
import type { StoredWorkspace, WorkspaceRepository } from './workspace.js';
import { EXAMPLES_WORKSPACE_ID, WorkspaceController } from './workspace.js';
import { WorkspaceDataSource } from './workspace-data-source.js';

class MemoryRepository implements WorkspaceRepository {
  readonly records = new Map<string, StoredWorkspace>();

  async list(): Promise<StoredWorkspace[]> {
    return [...this.records.values()].map((workspace) => structuredClone(workspace));
  }

  async put(workspace: StoredWorkspace): Promise<void> {
    this.records.set(workspace.id, structuredClone(workspace));
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

class MemoryPreferences {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const examples: DataSource = {
  loadManifest: async () => MANIFEST,
  loadDocument: async () => DOCUMENT,
};

const OPENAPI = `openapi: 3.1.0
info:
  title: Imported API
  version: 1.0.0
paths: {}
`;

function controller(
  repository = new MemoryRepository(),
  preferences = new MemoryPreferences(),
): WorkspaceController {
  let nextId = 0;
  return new WorkspaceController(examples, repository, {
    preferences,
    now: () => new Date('2026-09-10T20:00:00.000Z'),
    createId: () => {
      nextId += 1;
      return `generated-${nextId}`;
    },
  });
}

describe('browser workspaces', () => {
  it('starts with immutable bundled examples', async () => {
    const workspaces = controller();
    await workspaces.initialise();

    expect(workspaces.snapshot()).toMatchObject({
      activeId: EXAMPLES_WORKSPACE_ID,
      active: { name: MANIFEST.title, fileCount: MANIFEST.documents.length, readOnly: true },
    });
    await expect(
      new WorkspaceDataSource(workspaces, examples).loadDocument(DOCUMENT.id),
    ).resolves.toEqual(DOCUMENT);
  });

  it('creates uniquely named workspaces and remembers the active one', async () => {
    const repository = new MemoryRepository();
    const preferences = new MemoryPreferences();
    const workspaces = controller(repository, preferences);

    await expect(workspaces.create('Payments')).resolves.toMatchObject({
      id: 'generated-1',
      name: 'Payments',
    });
    await expect(workspaces.create('Payments')).resolves.toMatchObject({
      id: 'generated-2',
      name: 'Payments 2',
    });

    const restored = controller(repository, preferences);
    await restored.initialise();
    expect(restored.snapshot().active).toMatchObject({ id: 'generated-2', name: 'Payments 2' });
  });

  it('imports valid files independently and reports invalid files', async () => {
    const workspaces = controller();
    const result = await workspaces.importFiles([
      { name: 'billing.openapi.yaml', text: async () => OPENAPI },
      { name: 'notes.json', text: async () => '{"hello":"world"}' },
    ]);

    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]).toMatchObject({
      fileName: 'billing.openapi.yaml',
      document: { id: 'billing', title: 'Imported API', kind: 'openapi' },
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ fileName: 'notes.json' });
    await expect(
      new WorkspaceDataSource(workspaces, examples).loadManifest(),
    ).resolves.toMatchObject({
      generator: 'apibox/browser',
      documents: [{ id: 'billing' }],
    });
  });

  it('falls back to examples when the active workspace is deleted', async () => {
    const workspaces = controller();
    const created = await workspaces.create('Disposable');
    await workspaces.deleteWorkspace(created.id);

    expect(workspaces.snapshot().activeId).toBe(EXAMPLES_WORKSPACE_ID);
    await expect(new WorkspaceDataSource(workspaces, examples).loadManifest()).resolves.toEqual(
      MANIFEST,
    );
  });
});
