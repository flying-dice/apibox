import { buildSite } from '@apibox/cli';
import * as vscode from 'vscode';
import { PreviewSession } from './preview-session.js';
import { pagesWorkflow } from './workflow.js';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ApiPreviewProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('apibox.preview', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    registerCommand('apibox.preview', 'Could not open the APIBox preview', previewActiveDocument),
    registerCommand('apibox.build', 'Could not build the APIBox site', () =>
      buildStaticSite(context),
    ),
    registerCommand(
      'apibox.deploy',
      'Could not configure APIBox GitHub Pages deployment',
      scaffoldPagesWorkflow,
    ),
  );
}

export function deactivate(): void {}

class ApiPreviewProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const session = new PreviewSession(document, panel, mediaRoot);
    await session.start();
    panel.onDidDispose(() => session.dispose());
  }
}

async function previewActiveDocument(): Promise<void> {
  const document = vscode.window.activeTextEditor?.document;
  if (!document) {
    void vscode.window.showWarningMessage('Open an API specification first.');
    return;
  }
  await vscode.commands.executeCommand('vscode.openWith', document.uri, 'apibox.preview');
}

async function buildStaticSite(context: vscode.ExtensionContext): Promise<void> {
  const inputs = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: true,
    openLabel: 'Select API specifications',
    filters: { 'API specifications': ['yaml', 'yml', 'json'] },
  });
  if (!inputs?.length) return;
  const destinations = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Build here',
  });
  const destination = destinations?.[0];
  if (!destination) return;
  const title = await vscode.window.showInputBox({
    prompt: 'Documentation title',
    value: 'API documentation',
  });
  if (title === undefined) return;
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Building APIBox site…' },
    async () => {
      await buildSite({
        inputs: inputs.map((uri) => uri.fsPath),
        outDir: destination.fsPath,
        title,
        assetDir: vscode.Uri.joinPath(context.extensionUri, 'static-viewer').fsPath,
        generator: `apibox-vscode/${context.extension.packageJSON.version}`,
      });
    },
  );
  void vscode.window.showInformationMessage(`APIBox site built in ${destination.fsPath}.`);
}

async function scaffoldPagesWorkflow(): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    void vscode.window.showWarningMessage('Open a workspace before configuring Pages.');
    return;
  }
  const inputs = await vscode.window.showInputBox({
    prompt: 'Specification file or glob used by GitHub Actions',
    value: 'examples/*.{yaml,yml,json}',
  });
  if (!inputs) return;
  const workflow = vscode.Uri.joinPath(workspace.uri, '.github', 'workflows', 'apibox-pages.yml');
  try {
    await vscode.workspace.fs.stat(workflow);
    const answer = await vscode.window.showWarningMessage(
      'The APIBox Pages workflow already exists. Replace it?',
      { modal: true },
      'Replace',
    );
    if (answer !== 'Replace') return;
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError && error.code === 'FileNotFound')) throw error;
  }
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workflow, '..'));
  await vscode.workspace.fs.writeFile(workflow, new TextEncoder().encode(pagesWorkflow(inputs)));
  const action = await vscode.window.showInformationMessage(
    'Created the APIBox Pages workflow. Enable GitHub Pages with GitHub Actions as its source, then commit and push this file.',
    'Open workflow',
    'Open Source Control',
  );
  if (action === 'Open workflow') await vscode.window.showTextDocument(workflow);
  if (action === 'Open Source Control') await vscode.commands.executeCommand('workbench.view.scm');
}

function registerCommand(
  id: string,
  errorContext: string,
  command: () => Promise<void>,
): vscode.Disposable {
  return vscode.commands.registerCommand(id, async () => {
    try {
      await command();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await vscode.window.showErrorMessage(`${errorContext}: ${detail}`);
    }
  });
}
