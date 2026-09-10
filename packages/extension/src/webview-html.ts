import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as vscode from 'vscode';

export async function webviewHtml(webview: vscode.Webview, mediaRoot: vscode.Uri): Promise<string> {
  const template = await readFile(vscode.Uri.joinPath(mediaRoot, 'index.html').fsPath, 'utf8');
  const nonce = randomBytes(16).toString('base64');
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'assets', 'viewer.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'assets', 'viewer.css'));
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />`;
  const requiredTokens = [
    '<!-- apibox:base -->',
    '<!-- apibox:title -->apibox',
    'src="./assets/viewer.js"',
    'href="./assets/viewer.css"',
  ];
  const missing = requiredTokens.filter((token) => !template.includes(token));
  if (missing.length > 0) {
    throw new Error(`The bundled viewer template is missing: ${missing.join(', ')}`);
  }
  const rendered = template
    .replace('<!-- apibox:base -->', csp)
    .replace('<!-- apibox:title -->apibox', 'APIBox Preview')
    .replace('src="./assets/viewer.js"', `nonce="${nonce}" src="${scriptUri}"`)
    .replace('href="./assets/viewer.css"', `href="${styleUri}"`);
  if (requiredTokens.some((token) => rendered.includes(token))) {
    throw new Error('The bundled viewer template could not be rendered completely.');
  }
  return rendered;
}
