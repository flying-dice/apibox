---
status: Accepted
date: 2026-09-10
---
# Decision 04 — Theme through VS Code's CSS variables

## Context

The same components render in three hosts: a VS Code webview, Storybook, and a static
site on the open web. Inside a webview, VS Code injects a large set of `--vscode-*` CSS
variables reflecting the user's current colour theme. Outside one, those variables do not
exist.

The temptation is to branch — a webview stylesheet and a web stylesheet — which
guarantees the two drift apart.

## Decision

Components never reference `--vscode-*` directly. They use a semantic token layer:

```css
--apibox-fg: var(--vscode-foreground, #cccccc);
```

Inside a webview the `--vscode-*` variables are supplied by VS Code, so documentation
inherits the user's theme for free, including themes we have never seen. Outside one,
`theme-dark.css`, `theme-light.css` and the Storybook high-contrast theme *define* those same
variables using palettes derived from Dark Modern, Light Modern and Default High Contrast,
with a stronger documentation-specific surface ladder and form-control contrast. Native
widget, input, toolbar, icon, diagnostic, shadow and contrast roles retain their platform
meaning; selected controls gain `contrastActiveBorder` outlines when VS Code marks the
webview as high contrast.

Same components, same look, three hosts, no branching in component code.

## Consequences

- Extension previews match the surrounding editor exactly, and follow a theme switch
  without a reload.
- Storybook toggles light, dark and high-contrast stylesheets, so parity is verified
  continuously rather than discovered at the end.
- We inherit VS Code's palette, which is a real constraint: a colour that reads well in
  Dark Modern may not exist in a user's chosen theme. Every colour must come from a token
  with a sensible fallback, never a literal.
