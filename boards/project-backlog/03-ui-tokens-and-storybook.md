---
column: review
labels: [ui, infra]
priority: high
package: ui
agent: codex
live: false
updatedAt: 2026-09-11T00:27:08.000Z
---
# UI design tokens, VS Code theming and Storybook

Set up `@apibox/ui` with the token layer that makes one component library look native
in three different hosts. Components reference semantic `--apibox-*` tokens, which
resolve to `--vscode-*` variables with fallbacks. Inside a webview VS Code supplies
those variables, so the docs inherit the user's theme for free; outside one, shipped
theme stylesheets define them. See decisions/04-vscode-native-theming.md.

Storybook is where light/dark/high-contrast parity gets verified continuously rather than at the end.

## Checklist

- [x] `tokens.css` semantic token layer
- [x] Dark, light and high-contrast standalone themes model their native VS Code counterparts
- [x] Storybook 10 with the Svelte + Vite framework
- [x] Theme toolbar toggle that swaps the stylesheets
- [x] A tokens story that renders the full palette
- [x] Contrast enforcement for every text token, in every standalone theme

## Gates

- [x] tests-passing — typecheck, biome, vitest and a Storybook build all green; 19 tests in packages/ui, 88 across the workspace (claude, 2026-09-10T15:55:00.000Z)
- [x] codex-review — gpt-5.6-terra, read-only sandbox; three findings, all three fixed (claude, 2026-09-10T15:55:00.000Z)
- [x] clean-code-review — no marker above 0.5 (claude, 2026-09-10T15:55:00.000Z)
- [x] tests-passing — typecheck and lint clean; 247 unit + 20 Playwright tests green after dark/light production render review (codex, 2026-09-10T23:43:00Z)
- [x] clean-code-review — marker gate reports zero findings above 0.5 (codex, 2026-09-10T23:43:00Z)
- [x] tests-passing — typecheck, lint, 251 unit tests, 22 Playwright scenarios and the Storybook production build pass (codex, 2026-09-11T00:27:08.000Z)
- [x] clean-code-review — full eight-principle audit resolved its host-boundary finding; marker gate reports zero above 0.5 (codex, 2026-09-11T00:27:08.000Z)
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

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
- **codex** (2026-09-10T23:36:00.000Z): Reopened the card for a full rendered contrast sweep after the page, nested surfaces and workspace form controls were reported as visually clashing. Auditing the dark/light surface ladder in packages/ui/src/tokens/theme-dark.css:14-25 and packages/ui/src/tokens/theme-light.css:21-32, plus component usage in packages/viewer/src/WorkspaceManager.svelte:180-335 and packages/viewer/src/WorkspaceDialog.svelte:145-167.
- **codex** (2026-09-10T23:42:00.000Z): Rebalanced canvas, sunken, raised, input, hover and code roles in packages/ui/src/tokens/theme-dark.css:14-26 and packages/ui/src/tokens/theme-light.css:22-34; softened coloured badge fills in packages/ui/src/atoms/Badge.svelte:68-73; and separated the workspace dialog's header, list, create panel, cards and input in packages/viewer/src/WorkspaceDialog.svelte:145-168. Dark/light production renders now show a legible stepped hierarchy rather than near-identical panels. Expanded token tests in packages/ui/src/tokens/theme-parity.test.ts:126-182 to cover every content surface and 3:1 form boundaries; verification is in progress.
- **codex** (2026-09-10T23:43:00.000Z): Completed the production-rendered designer sweep in both themes at desktop and mobile widths. Semantic text now clears 4.5:1 against all six content surfaces and form boundaries clear 3:1 in packages/ui/src/tokens/theme-parity.test.ts:126-183. Operation methods use the quieter badge treatment at packages/ui/src/organisms/OperationCard.svelte:22-31, while primary workspace actions retain solid emphasis. Updated the rationale and surface contract in docs/03-theming.md:1-67 and decisions/04-vscode-native-theming.md:20-32. All Review gates pass; returned the card to Review.
- **codex** (2026-09-11T00:14:24.000Z): Reopened the theming card to bring across Open Domain Specification's broader native VS Code role coverage. APIBox already excludes its standalone themes from the extension build at packages/viewer/src/main.ts:10-12, but packages/ui/src/tokens/tokens.css:18-52 lacks native icon, toolbar-hover, widget-border/shadow, active-contrast and diagnostic roles plus explicit high-contrast treatment.
- **codex** (2026-09-11T00:27:08.000Z): Returned to Review after completing native parity. The semantic adapter now maps icon, toolbar-hover, widget-border/shadow, contrast and editor diagnostic roles at packages/ui/src/tokens/tokens.css:18-57; packages/ui/src/tokens/theme-high-contrast.css:1-56 adds a reviewable Default High Contrast palette; and packages/ui/.storybook/preview.ts:1-39 exposes it in Storybook. Buttons, navigation and workspace selection consume only APIBox tokens at packages/ui/src/atoms/Button.svelte:75-106, packages/ui/src/molecules/NavItem.svelte:81-96 and packages/viewer/src/WorkspaceManager.svelte:247-285, so both VS Code high-contrast variants work without host-class coupling. Browser coverage at tests/e2e/viewer.spec.ts:81-124 injects native values, proves their rendered resolution and checks the active outline. The synced extension bundle contains every new native role and no standalone theme selector. Typecheck, lint, 251 unit tests, 22 Playwright scenarios and Storybook build pass; the full clean-code audit is clear after resolving one boundary finding.
