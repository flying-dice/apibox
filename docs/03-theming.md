# Theming

The same components render in a VS Code webview, in Storybook, and on the open web. VS
Code injects `--vscode-*` CSS variables reflecting the user's theme; the other two hosts
do not.

Rather than branch, components use a semantic token layer and never reference a
`--vscode-*` variable or a colour literal directly:

```css
:root {
  --apibox-fg:        var(--vscode-foreground, #d7dae0);
  --apibox-bg:        var(--vscode-editor-background, #17191e);
  --apibox-border:    var(--vscode-panel-border, #303640);
  --apibox-accent:    var(--vscode-textLink-foreground, #4daafc);
  --apibox-font:      var(--vscode-font-family, ui-sans-serif, system-ui);
  --apibox-code-font: var(--vscode-editor-font-family, ui-monospace, monospace);
}
```

Inside a webview, VS Code supplies the fallback's target, so documentation inherits the
user's theme — including themes we have never seen — and follows a theme switch without a
reload. Outside one, `theme-dark.css`, `theme-light.css` and the Storybook-focused
`theme-high-contrast.css` define the same `--vscode-*` variables. Their hues begin with Dark
Modern, Light Modern and Default High Contrast, then adjust surface spacing and contrast for
a dense documentation page rather than copying the editor chrome literally.

The semantic adapter covers the native roles used by the application: editor, sidebar,
widget, input and code surfaces; foreground, description and icon text; panel, widget, input
and contrast borders; widget shadows; list and toolbar interaction states; links, focus,
buttons and badges; editor diagnostics; and chart colours for API protocol categories. In a
VS Code webview none of the standalone theme files are bundled, so these roles always resolve
from the editor's injected values.

## Surface hierarchy

Surfaces have fixed semantic roles. The page canvas is the neutral backdrop, sidebars and
nested content use the sunken surface, cards and overlays use the raised surface, and form
fields use the input surface with a dedicated boundary. Do not substitute one merely because
its current colour looks close: light mode intentionally uses a gray canvas with white cards,
while dark mode steps from a near-black sidebar through the canvas to lighter cards and fields.

Status and method badges use a quiet tint rather than a saturated block. Primary actions keep
the solid accent fill, so colour communicates action priority instead of becoming another
competing surface.

## Rules

- Never write a colour literal in a component. Add a token instead.
- Never reference `--vscode-*` from a component. Tokens are the only place that name
  appears.
- Every token needs a fallback, because a user's theme may not define the variable.
- Add every new colour token to `src/tokens/token-manifest.ts`. The tests fail otherwise,
  because a token missing from the manifest is one nobody sees in Storybook and nobody
  checks for contrast.
- Check light, dark and high contrast in Storybook before calling a component done.

## Contrast

Text tokens must clear WCAG AA (4.5:1) against the canvas, sunken, raised, input, hover and
code surfaces in every standalone theme. Form-field boundaries must clear the WCAG 3:1
non-text contrast threshold against the field fill. `theme-parity.test.ts` enforces these
rules by resolving each token through its `var()` chain and computing the ratio, so a palette
change that breaks contrast fails the build with the offending token, colour and ratio named.

This is why the light theme's status and protocol colours are darker than VS Code's Light
Modern, while the dark theme's red, blue and purple are lighter. VS Code uses chart values
for lines and areas, where a lower ratio is acceptable; APIBox uses some of them for text
such as method labels across several nested surfaces. Warning, error and information states
use the corresponding native editor diagnostic roles instead of borrowing chart colours.

High contrast resolves through VS Code's `contrastBorder` and `contrastActiveBorder`
variables. Those tokens are transparent in the standalone light and dark themes, so
components can always declare the outline without branching on VS Code-only body classes.
The Storybook high-contrast option supplies representative variables, keeping this behavior
reviewable outside an Extension Development Host and covering high-contrast light as well as
dark when the extension receives either palette from VS Code.

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
