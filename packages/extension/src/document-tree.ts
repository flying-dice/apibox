import * as vscode from 'vscode';
import { buildDocumentIndex, type DetectedDocument, type DocumentGroup } from './document-index.js';

const DEFAULT_INCLUDE = ['**/*.{yaml,yml,json}'];
const DEFAULT_EXCLUDE = ['**/node_modules/**'];

/** Debounce a burst of filesystem events (e.g. a branch switch) into one rescan. */
const REFRESH_DEBOUNCE_MS = 300;

export class DocumentGroupItem extends vscode.TreeItem {
  constructor(readonly group: DocumentGroup) {
    super(group.label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'apibox.documentGroup';
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}

export class DocumentItem extends vscode.TreeItem {
  constructor(readonly document: DetectedDocument) {
    super(document.label, vscode.TreeItemCollapsibleState.None);
    this.resourceUri = vscode.Uri.file(document.path);
    this.contextValue = 'apibox.document';
    this.iconPath = vscode.ThemeIcon.File;
    this.tooltip = document.path;
    // Reuses the existing preview command rather than duplicating how the preview is opened.
    this.command = {
      command: 'apibox.preview',
      title: 'Open in APIBox',
      arguments: [this.resourceUri],
    };
  }
}

export type DocumentTreeNode = DocumentGroupItem | DocumentItem;

/**
 * `vscode.TreeDataProvider` wrapper over `document-index.ts`. All detection, filtering and
 * grouping logic lives there and is covered by vitest; this class is only responsible for
 * talking to `vscode.workspace` (glob scanning, file reads, watching, settings) and shaping
 * the result into tree items.
 */
export class DocumentTreeProvider
  implements vscode.TreeDataProvider<DocumentTreeNode>, vscode.Disposable
{
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    DocumentTreeNode | undefined
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private groups: DocumentGroup[] = [];
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private readonly subscriptions: vscode.Disposable[] = [];
  /**
   * Held separately from `subscriptions` because the watcher is rebuilt whenever the
   * include globs change. Keeping them here lets the previous set be dropped as well as
   * disposed, so editing a setting repeatedly cannot grow the list without bound.
   */
  private watcherSubscriptions: vscode.Disposable[] = [];

  constructor() {
    this.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration('apibox.include') ||
          event.affectsConfiguration('apibox.exclude')
        ) {
          this.setupWatcher();
          this.scheduleRefresh();
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.scheduleRefresh()),
    );
    this.setupWatcher();
    this.scheduleRefresh();
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.disposeWatcher();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.onDidChangeTreeDataEmitter.dispose();
  }

  getTreeItem(element: DocumentTreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DocumentTreeNode): DocumentTreeNode[] {
    if (!element) return this.groups.map((group) => new DocumentGroupItem(group));
    if (element instanceof DocumentGroupItem) {
      return element.group.documents.map((document) => new DocumentItem(document));
    }
    return [];
  }

  /** Rescans the workspace immediately. Bound to the `apibox.refreshDocuments` command. */
  async refresh(): Promise<void> {
    const paths = await this.findCandidates();
    this.groups = await buildDocumentIndex(paths, async (path) => {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
      return Buffer.from(bytes).toString('utf8');
    });
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => void this.refresh(), REFRESH_DEBOUNCE_MS);
  }

  private setupWatcher(): void {
    this.disposeWatcher();
    const pattern = `{${this.include().join(',')}}`;
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.watcherSubscriptions.push(
      watcher,
      watcher.onDidCreate(() => this.scheduleRefresh()),
      watcher.onDidChange(() => this.scheduleRefresh()),
      watcher.onDidDelete(() => this.scheduleRefresh()),
    );
  }

  private disposeWatcher(): void {
    for (const subscription of this.watcherSubscriptions) subscription.dispose();
    this.watcherSubscriptions = [];
  }

  private include(): string[] {
    return vscode.workspace.getConfiguration('apibox').get('include', DEFAULT_INCLUDE);
  }

  private exclude(): string[] {
    return vscode.workspace.getConfiguration('apibox').get('exclude', DEFAULT_EXCLUDE);
  }

  private async findCandidates(): Promise<string[]> {
    const exclude = this.exclude();
    const excludePattern = exclude.length ? `{${exclude.join(',')}}` : undefined;
    const found = new Map<string, vscode.Uri>();
    for (const pattern of this.include()) {
      for (const uri of await vscode.workspace.findFiles(pattern, excludePattern)) {
        found.set(uri.fsPath, uri);
      }
    }
    return [...found.keys()];
  }
}
