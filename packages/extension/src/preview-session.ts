import type { ApiDocument } from '@apibox/core';
import { parseApiDocument, parseDocument } from '@apibox/core';
import type { HostToViewerMessage, ViewerToHostMessage } from '@apibox/viewer/protocol';
import { isViewerToHostMessage } from '@apibox/viewer/protocol';
import * as vscode from 'vscode';
import { manifestMessage } from './preview-protocol.js';
import { webviewHtml } from './webview-html.js';

export class PreviewSession implements vscode.Disposable {
  #cachedVersion = -1;
  #cachedDocument?: Promise<ApiDocument>;
  #refreshTimer?: ReturnType<typeof setTimeout>;
  #disposed = false;
  readonly #subscriptions: vscode.Disposable[] = [];

  constructor(
    private readonly document: vscode.TextDocument,
    private readonly panel: vscode.WebviewPanel,
    private readonly mediaRoot: vscode.Uri,
  ) {}

  async start(): Promise<void> {
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.mediaRoot],
    };
    await this.#refreshWebview();
    this.#subscriptions.push(
      this.panel.webview.onDidReceiveMessage((value: unknown) => {
        void this.#handleMessage(value).catch((error: unknown) =>
          this.#reportFailure('Could not respond to the APIBox preview', error),
        );
      }),
      vscode.workspace.onDidChangeTextDocument((event) => this.#documentChanged(event)),
    );
  }

  dispose(): void {
    this.#disposed = true;
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    for (const subscription of this.#subscriptions) subscription.dispose();
  }

  async #handleMessage(value: unknown): Promise<void> {
    if (!isViewerToHostMessage(value)) return;
    let apiDocument: ApiDocument;
    try {
      apiDocument = await this.#currentDocument();
    } catch (error) {
      await this.#sendParseError(value, error);
      return;
    }
    if (value.type === 'apibox/loadManifest') {
      await this.#send(manifestMessage(apiDocument));
    } else if (value.documentId === apiDocument.id) {
      await this.#send({
        type: 'apibox/document',
        documentId: value.documentId,
        document: apiDocument,
      });
    } else {
      await this.#send({
        type: 'apibox/error',
        request: 'document',
        documentId: value.documentId,
        message: `Document '${value.documentId}' is not open in this editor.`,
      });
    }
  }

  #currentDocument(): Promise<ApiDocument> {
    if (this.#cachedDocument && this.#cachedVersion === this.document.version) {
      return this.#cachedDocument;
    }
    this.#cachedVersion = this.document.version;
    this.#cachedDocument = parseApiDocument(parseDocument(this.document.getText()), {
      location:
        this.document.uri.scheme === 'file'
          ? this.document.uri.fsPath
          : this.document.uri.toString(),
    });
    return this.#cachedDocument;
  }

  #documentChanged(event: vscode.TextDocumentChangeEvent): void {
    if (event.document !== this.document) return;
    this.#cachedDocument = undefined;
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    this.#refreshTimer = setTimeout(() => {
      void this.#refreshWebview().catch((error: unknown) => this.#handleRefreshFailure(error));
    }, 150);
  }

  async #refreshWebview(): Promise<void> {
    if (this.#disposed) return;
    const html = await webviewHtml(this.panel.webview, this.mediaRoot);
    if (!this.#disposed) this.panel.webview.html = html;
  }

  #handleRefreshFailure(error: unknown): void {
    if (this.#disposed) return;
    try {
      this.panel.webview.html = errorHtml(error);
    } catch {
      // The panel may have been disposed between the guard and assignment.
    }
    this.#reportFailure('Could not refresh the APIBox preview', error);
  }

  async #send(message: HostToViewerMessage): Promise<void> {
    if (!(await this.panel.webview.postMessage(message))) {
      throw new Error('The preview panel did not accept the extension response.');
    }
  }

  async #sendParseError(request: ViewerToHostMessage, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.#send(
      request.type === 'apibox/loadManifest'
        ? { type: 'apibox/error', request: 'manifest', message }
        : { type: 'apibox/error', request: 'document', documentId: request.documentId, message },
    );
  }

  #reportFailure(context: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`${context}: ${detail}`);
  }
}

function errorHtml(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  const escaped = detail
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none';"><p>APIBox could not load the preview: ${escaped}</p>`;
}
