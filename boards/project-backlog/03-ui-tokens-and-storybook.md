---
column: review
labels: [ui, infra]
priority: high
package: ui
agent: claude
live: false
updatedAt: 2026-09-10T15:55:00.000Z
---
# UI design tokens, VS Code theming and Storybook

Set up `@apibox/ui` with the token layer that makes one component library look native
in three different hosts. Components reference semantic `--apibox-*` tokens, which
resolve to `--vscode-*` variables with fallbacks. Inside a webview VS Code supplies
those variables, so the docs inherit the user's theme for free; outside one, shipped
theme stylesheets define them. See decisions/04-vscode-native-theming.md.

Storybook is where light/dark parity gets verified continuously rather than at the end.

## Checklist

- [x] `tokens.css` semantic token layer
- [x] `theme-dark.css` / `theme-light.css` ported from Dark Modern and Light Modern
- [x] Storybook 10 with the Svelte + Vite framework
- [x] Theme toolbar toggle that swaps the stylesheets
- [x] A tokens story that renders the full palette
- [x] Contrast enforcement for every text token, in both themes

## Gates

- [x] tests-passing — typecheck, biome, vitest and a Storybook build all green; 19 tests in packages/ui, 88 across the workspace (claude, 2026-09-10T15:55:00.000Z)
- [x] codex-review — gpt-5.6-terra, read-only sandbox; three findings, all three fixed (claude, 2026-09-10T15:55:00.000Z)
- [x] clean-code-review — no marker above 0.5 (claude, 2026-09-10T15:55:00.000Z)

## Comments

- **claude** (2026-09-10T15:55:00.000Z): Built the token layer at packages/ui/src/tokens/tokens.css:1-100. Components reference only `--apibox-*`; each resolves to a `--vscode-*` variable with a Dark Modern fallback. Themes at packages/ui/src/tokens/theme-dark.css:1-53 and theme-light.css:1-60 are scoped to `:root[data-apibox-theme=…]` rather than a class, because custom properties resolve against the element they are declared on — `--apibox-fg` lives on `:root`, so `--vscode-foreground` has to as well or the fallback silently wins. Storybook config at packages/ui/.storybook/preview.ts:1-52 drives the same attribute, so what Storybook shows is what ships.
- **claude** (2026-09-10T15:55:00.000Z): The parity test earned its place on its first run: it caught `--vscode-font-weight` being consumed by the token layer but defined in neither theme (packages/ui/src/tokens/theme-parity.test.ts:33-45). That is exactly the failure it exists for — a token silently rendering its fallback, which looks nearly right and is invisible by eye.
- **claude** (2026-09-10T15:55:00.000Z): Near-miss worth recording. I wrote the component test as `Tokens.test.ts` beside the existing `tokens.test.ts`. macOS is case-insensitive, so those are the same file and the write silently destroyed the theme parity tests — no error, the file simply became something else. I noticed only because a stack trace pointed at a line number that did not match what I believed was there. Now split into packages/ui/src/tokens/theme-parity.test.ts and packages/ui/src/tokens/Tokens.svelte.test.ts. Worth a naming rule: on a case-sensitive CI box those two files would coexist and diverge instead of colliding, which is a worse failure than the local one.
- **claude** (2026-09-10T15:55:00.000Z): Codex review (`gpt-5.6-terra`, read-only sandbox) confirmed the theming mechanism, the Storybook 10 / Svelte 5 configuration and SSR-safety as clean, and raised three findings. All three were fair and all three are fixed:

  1. **Light theme text failed WCAG AA** (medium). Verified independently before changing anything: Light Modern's green, blue and orange measure 4.33, 3.59 and 4.20 against white, all under the 4.5 threshold. VS Code uses those values for charts — lines and areas, where a lower ratio passes — but we use them for text such as method labels. Darkened to #1f7a1f, #0a5fc2 and #8a4f12 (5.44, 6.12, 6.55) in packages/ui/src/tokens/theme-light.css:40-46, with the reasoning recorded in the file so nobody "corrects" them back. Dark theme was checked too and passes throughout, lowest 4.61.

     Deliberately scoped to our own theme files: inside a webview the user's theme supplies these variables, and overriding a user's chosen theme to satisfy a checker would be the wrong trade.
  2. **The tests proved nothing about actual theming** (medium) — they were text analysis over stylesheets, so a wrong-but-declared mapping or an unedited copy of a theme would pass. jsdom does not implement `var()` substitution, so `getComputedStyle` would assert nothing either. Added packages/ui/src/tokens/resolve.ts:1-120, which resolves the `--apibox-*` → `--vscode-*` → theme-value chain the way a browser would, plus contrast maths. The tests now assert resolved colours, that the two themes genuinely differ, and AA for every text token. Confirmed the contrast test actually bites by reverting the light blue and watching it fail with the exact token, colour and ratio.
  3. **The showcase test asserted a hand-picked subset** (low) while claiming to cover every token. Both the showcase and the tests now read packages/ui/src/tokens/token-manifest.ts:1-140, and a test fails if `tokens.css` declares a colour the manifest omits — so a new token cannot go undocumented or unchecked for contrast.

  Its remaining coverage note is fair and deferred rather than dismissed: a real browser test that switches the attribute on a live page, and SSR hydration coverage. Both need a browser and belong with the viewer, so they go on card 07.
