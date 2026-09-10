import * as assert from 'node:assert/strict';
import { basename, join } from 'node:path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'flying-dice.apibox-vscode';

function waitForPreview(): Promise<vscode.Tab> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      reject(new Error('Timed out waiting for the APIBox custom editor.'));
    }, 15_000);
    const findPreview = () =>
      vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .find(
          (tab) =>
            tab.input instanceof vscode.TabInputCustom && tab.input.viewType === 'apibox.preview',
        );
    const subscription = vscode.window.tabGroups.onDidChangeTabs(() => {
      const preview = findPreview();
      if (!preview) return;
      clearTimeout(timer);
      subscription.dispose();
      resolve(preview);
    });
    const existing = findPreview();
    if (existing) {
      clearTimeout(timer);
      subscription.dispose();
      resolve(existing);
    }
  });
}

describe('APIBox in a real VS Code Extension Host', function () {
  this.timeout(60_000);

  it('loads the examples workspace, activates, and mounts a working preview', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, 'the Extension Host must open a workspace');
    assert.equal(basename(folder.uri.fsPath), 'examples');

    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} is not loaded`);
    await extension.activate();
    assert.ok(extension.isActive, 'APIBox did not activate');

    const documentUri = vscode.Uri.file(join(folder.uri.fsPath, 'petstore.yaml'));
    const previewOpened = waitForPreview();
    await vscode.commands.executeCommand('apibox.preview', documentUri);
    const preview = await previewOpened;
    assert.ok(preview, 'the APIBox custom editor did not open');
  });
});
