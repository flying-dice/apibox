import type { ApiDocument } from '@apibox/core/browser';
import type { DataSource } from './data-source.js';
import { importWorkspaceFiles } from './workspace-importer.js';

export const EXAMPLES_WORKSPACE_ID = 'examples';
export const EXAMPLES_WORKSPACE_NAME = 'APIBox examples';
const ACTIVE_WORKSPACE_KEY = 'apibox.active-workspace';

export interface WorkspaceFile {
  id: string;
  fileName: string;
  content: string;
  document: ApiDocument;
}

export interface StoredWorkspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  files: WorkspaceFile[];
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  fileCount: number;
  updatedAt?: string;
  readOnly: boolean;
}

export interface WorkspaceSnapshot {
  activeId: string;
  active: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
}

export function workspaceDetail(workspace: WorkspaceSummary): string {
  if (workspace.readOnly) return `${workspace.fileCount} bundled files`;
  return `${workspace.fileCount} ${workspace.fileCount === 1 ? 'file' : 'files'} · this browser`;
}

export interface ImportCandidate {
  name: string;
  text(): Promise<string>;
}

export interface ImportFailure {
  fileName: string;
  message: string;
}

export interface ImportResult {
  imported: WorkspaceFile[];
  failures: ImportFailure[];
}

export interface WorkspaceRepository {
  list(): Promise<StoredWorkspace[]>;
  put(workspace: StoredWorkspace): Promise<void>;
  delete(id: string): Promise<void>;
}

interface PreferenceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface WorkspaceControllerOptions {
  preferences?: PreferenceStore;
  now?: () => Date;
  createId?: () => string;
}

export class WorkspaceController {
  readonly #listeners = new Set<(snapshot: WorkspaceSnapshot) => void>();
  readonly #preferences?: PreferenceStore;
  readonly #now: () => Date;
  readonly #createId: () => string;
  #activeId = EXAMPLES_WORKSPACE_ID;
  #workspaces: StoredWorkspace[] = [];
  #initialisePromise?: Promise<void>;
  #exampleName = EXAMPLES_WORKSPACE_NAME;
  #exampleFileCount = 0;

  constructor(
    private readonly examples: DataSource,
    private readonly repository: WorkspaceRepository,
    options: WorkspaceControllerOptions = {},
  ) {
    this.#preferences = options.preferences;
    this.#now = options.now ?? (() => new Date());
    this.#createId = options.createId ?? (() => globalThis.crypto.randomUUID());
  }

  async initialise(): Promise<void> {
    if (!this.#initialisePromise) this.#initialisePromise = this.#load();
    return this.#initialisePromise;
  }

  snapshot(): WorkspaceSnapshot {
    const summaries = [this.#exampleSummary(), ...this.#workspaces.map(toSummary)];
    return {
      activeId: this.#activeId,
      active:
        summaries.find((workspace) => workspace.id === this.#activeId) ?? this.#exampleSummary(),
      workspaces: summaries,
    };
  }

  subscribe(listener: (snapshot: WorkspaceSnapshot) => void): () => void {
    this.#listeners.add(listener);
    listener(this.snapshot());
    return () => this.#listeners.delete(listener);
  }

  async create(name: string): Promise<StoredWorkspace> {
    await this.initialise();
    const timestamp = this.#now().toISOString();
    const workspace: StoredWorkspace = {
      id: this.#createId(),
      name: uniqueWorkspaceName(name, this.#workspaces),
      createdAt: timestamp,
      updatedAt: timestamp,
      files: [],
    };
    await this.repository.put(workspace);
    this.#workspaces.push(workspace);
    this.#setActive(workspace.id);
    return workspace;
  }

  async activate(id: string): Promise<void> {
    await this.initialise();
    if (id !== EXAMPLES_WORKSPACE_ID && !this.#workspaces.some((entry) => entry.id === id)) {
      throw new Error('That workspace is no longer available.');
    }
    this.#setActive(id);
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.initialise();
    if (id === EXAMPLES_WORKSPACE_ID) throw new Error('The bundled examples cannot be deleted.');
    await this.repository.delete(id);
    this.#workspaces = this.#workspaces.filter((workspace) => workspace.id !== id);
    if (this.#activeId === id) this.#setActive(EXAMPLES_WORKSPACE_ID);
    else this.#emit();
  }

  async importFiles(files: readonly ImportCandidate[]): Promise<ImportResult> {
    await this.initialise();
    const workspace = await this.#writableWorkspace();
    const { imported, failures } = await importWorkspaceFiles(
      files,
      workspace.files,
      this.#createId,
    );

    if (imported.length > 0) {
      workspace.files.push(...imported);
      workspace.updatedAt = this.#now().toISOString();
      await this.repository.put(workspace);
      this.#emit();
    }
    return { imported, failures };
  }

  async removeFile(fileId: string): Promise<void> {
    await this.initialise();
    const workspace = this.#activeWorkspace();
    if (!workspace) throw new Error('The bundled examples cannot be changed.');
    workspace.files = workspace.files.filter((file) => file.id !== fileId);
    workspace.updatedAt = this.#now().toISOString();
    await this.repository.put(workspace);
    this.#emit();
  }

  activeFiles(): readonly WorkspaceFile[] {
    return this.#activeWorkspace()?.files ?? [];
  }

  activeWorkspace(): Readonly<StoredWorkspace> | undefined {
    return this.#activeWorkspace();
  }

  async #load(): Promise<void> {
    const [workspaces, manifest] = await Promise.all([
      this.repository.list(),
      this.examples.loadManifest(),
    ]);
    this.#workspaces = workspaces;
    this.#exampleName = manifest.title || EXAMPLES_WORKSPACE_NAME;
    this.#exampleFileCount = manifest.documents.length;
    const preferred = this.#preferences?.getItem(ACTIVE_WORKSPACE_KEY);
    if (preferred && this.#workspaces.some((workspace) => workspace.id === preferred)) {
      this.#activeId = preferred;
    }
    this.#emit();
  }

  async #writableWorkspace(): Promise<StoredWorkspace> {
    const active = this.#activeWorkspace();
    if (active) return active;
    return this.create('My workspace');
  }

  #activeWorkspace(): StoredWorkspace | undefined {
    return this.#workspaces.find((workspace) => workspace.id === this.#activeId);
  }

  #exampleSummary(): WorkspaceSummary {
    return {
      id: EXAMPLES_WORKSPACE_ID,
      name: this.#exampleName,
      fileCount: this.#exampleFileCount,
      readOnly: true,
    };
  }

  #setActive(id: string): void {
    this.#activeId = id;
    if (id === EXAMPLES_WORKSPACE_ID) this.#preferences?.removeItem(ACTIVE_WORKSPACE_KEY);
    else this.#preferences?.setItem(ACTIVE_WORKSPACE_KEY, id);
    this.#emit();
  }

  #emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }
}

function uniqueWorkspaceName(requested: string, workspaces: readonly StoredWorkspace[]): string {
  const base = requested.trim() || 'Untitled workspace';
  const names = new Set(workspaces.map((workspace) => workspace.name.toLocaleLowerCase()));
  if (!names.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

function toSummary(workspace: StoredWorkspace): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    fileCount: workspace.files.length,
    updatedAt: workspace.updatedAt,
    readOnly: false,
  };
}
