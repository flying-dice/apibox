/** Applies deterministic host variables for the real-browser webview theme check. */
export function applyVsCodeThemeFixture(root: HTMLElement): void {
  root.style.setProperty('--vscode-foreground', '#123456');
  root.style.setProperty('--vscode-editor-background', '#f0e0d0');
  root.style.setProperty('--vscode-sideBar-background', '#e0d0c0');
  root.style.setProperty('--vscode-textLink-foreground', '#654321');
}
