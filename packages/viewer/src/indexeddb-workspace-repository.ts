import type { StoredWorkspace, WorkspaceRepository } from './workspace.js';

const DATABASE_NAME = 'apibox';
const DATABASE_VERSION = 1;
const STORE_NAME = 'workspaces';

interface PersistedWorkspaceFile {
  id: string;
  fileName: string;
  content: string;
  documentId: string;
}

interface PersistedWorkspaceRecord {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  files: PersistedWorkspaceFile[];
}

export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  #database?: Promise<IDBDatabase>;

  constructor(private readonly factory: IDBFactory = globalThis.indexedDB) {}

  async list(): Promise<StoredWorkspace[]> {
    const store = await this.#store('readonly');
    const storedValues = await request<unknown[]>(store.getAll());
    const workspaces = await Promise.all(
      storedValues.map(decodeWorkspaceRecord).map(hydrateWorkspace),
    );
    return workspaces.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async put(workspace: StoredWorkspace): Promise<void> {
    const store = await this.#store('readwrite');
    await request(store.put(persistWorkspace(workspace)));
  }

  async delete(id: string): Promise<void> {
    const store = await this.#store('readwrite');
    await request(store.delete(id));
  }

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    if (!this.#database) this.#database = openDatabase(this.factory);
    const database = await this.#database;
    return database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }
}

function decodeWorkspaceRecord(value: unknown): PersistedWorkspaceRecord {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.files)) {
    throw new Error('A saved workspace uses an unsupported storage format.');
  }
  const fields = ['id', 'name', 'createdAt', 'updatedAt'] as const;
  if (!fields.every((field) => typeof value[field] === 'string')) {
    throw new Error('A saved workspace is missing required details.');
  }
  return {
    schemaVersion: 1,
    id: value.id as string,
    name: value.name as string,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
    files: value.files.map(decodeWorkspaceFile),
  };
}

function decodeWorkspaceFile(value: unknown): PersistedWorkspaceFile {
  const fields = ['id', 'fileName', 'content', 'documentId'] as const;
  if (!isRecord(value) || !fields.every((field) => typeof value[field] === 'string')) {
    throw new Error('A saved workspace contains an invalid file record.');
  }
  return {
    id: value.id as string,
    fileName: value.fileName as string,
    content: value.content as string,
    documentId: value.documentId as string,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function persistWorkspace(workspace: StoredWorkspace): PersistedWorkspaceRecord {
  return {
    schemaVersion: 1,
    id: workspace.id,
    name: workspace.name,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    files: workspace.files.map(({ id, fileName, content, document }) => ({
      id,
      fileName,
      content,
      documentId: document.id,
    })),
  };
}

async function hydrateWorkspace(record: PersistedWorkspaceRecord): Promise<StoredWorkspace> {
  const { parseApiSource } = await import('@apibox/core/browser');
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    files: await Promise.all(
      record.files.map(async (file) => ({
        id: file.id,
        fileName: file.fileName,
        content: file.content,
        document: await parseApiSource(file.content, { id: file.documentId }),
      })),
    ),
  };
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = factory.open(DATABASE_NAME, DATABASE_VERSION);
    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error ?? new Error('Could not open storage.'));
    openRequest.onblocked = () => reject(new Error('Workspace storage is blocked by another tab.'));
  });
}

function request<T>(databaseRequest: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    databaseRequest.onsuccess = () => resolve(databaseRequest.result);
    databaseRequest.onerror = () =>
      reject(databaseRequest.error ?? new Error('Workspace storage operation failed.'));
  });
}
