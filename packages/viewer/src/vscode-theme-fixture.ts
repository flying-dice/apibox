export const VSCODE_THEME_FIXTURE = {
  '--vscode-foreground': '#123456',
  '--vscode-editor-background': '#f0e0d0',
  '--vscode-sideBar-background': '#e0d0c0',
  '--vscode-textLink-foreground': '#654321',
  '--vscode-icon-foreground': '#abcdef',
  '--vscode-toolbar-hoverBackground': '#102030',
  '--vscode-widget-border': '#456789',
  '--vscode-widget-shadow': '#234567',
  '--vscode-contrastBorder': '#345678',
  '--vscode-contrastActiveBorder': '#f38518',
  '--vscode-editorWarning-foreground': '#765432',
  '--vscode-editorError-foreground': '#876543',
  '--vscode-editorInfo-foreground': '#567890',
} as const;

/** Applies deterministic host variables for real-browser webview theme checks. */
export function applyVsCodeThemeFixture(root: HTMLElement): void {
  for (const [name, value] of Object.entries(VSCODE_THEME_FIXTURE)) {
    root.style.setProperty(name, value);
  }
}
