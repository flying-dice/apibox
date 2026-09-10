# Theming

The same components render in a VS Code webview, in Storybook, and on the open web. VS
Code injects `--vscode-*` CSS variables reflecting the user's theme; the other two hosts
do not.

Rather than branch, components use a semantic token layer and never reference a
`--vscode-*` variable or a colour literal directly:

```css
:root {
  --apibox-fg:        var(--vscode-foreground, #cccccc);
  --apibox-bg:        var(--vscode-editor-background, #1f1f1f);
  --apibox-border:    var(--vscode-panel-border, #2b2b2b);
  --apibox-accent:    var(--vscode-textLink-foreground, #4daafc);
  --apibox-font:      var(--vscode-font-family, ui-sans-serif, system-ui);
  --apibox-code-font: var(--vscode-editor-font-family, ui-monospace, monospace);
}
```

Inside a webview, VS Code supplies the fallback's target, so documentation inherits the
user's theme — including themes we have never seen — and follows a theme switch without a
reload. Outside one, `theme-dark.css` and `theme-light.css` define the same `--vscode-*`
variables, ported from Dark Modern and Light Modern.

## Rules

- Never write a colour literal in a component. Add a token instead.
- Never reference `--vscode-*` from a component. Tokens are the only place that name
  appears.
- Every token needs a fallback, because a user's theme may not define the variable.
- Add every new colour token to `src/tokens/token-manifest.ts`. The tests fail otherwise,
  because a token missing from the manifest is one nobody sees in Storybook and nobody
  checks for contrast.
- Check both themes in Storybook before calling a component done.

## Contrast

Text tokens must clear WCAG AA (4.5:1) against `--apibox-bg` and `--apibox-bg-sunken` in
both shipped themes. `theme-parity.test.ts` enforces this by resolving each token through
its `var()` chain and computing the ratio, so a palette change that breaks contrast fails
the build with the offending token, colour and ratio named.

This is why the light theme's green, blue and orange are darker than VS Code's Light
Modern. VS Code uses those values for charts — lines and areas, where a lower ratio is
acceptable — while we use them for text such as method labels. Light Modern's values
measure 4.33, 3.59 and 4.20 against white.

The rule stops at our own theme files. Inside a webview the user's theme supplies these
variables, and its contrast is the user's choice; overriding someone's chosen theme to
satisfy a checker would be the wrong trade.

## Why the themes are scoped to `:root`

Custom properties resolve against the element they are declared on. `--apibox-fg` is
declared on `:root`, so `--vscode-foreground` has to be declared there too — hence
`:root[data-apibox-theme='dark']` rather than a class on `body`. Declared lower in the
tree, the theme's values would be invisible to the token layer and every token would
silently render its fallback.

See `decisions/04-vscode-native-theming.md`.
