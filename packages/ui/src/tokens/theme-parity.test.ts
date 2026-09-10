import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseDeclarations, resolveToken } from './resolve.js';
import { ALL_COLOUR_TOKENS, TEXT_SURFACES, TOKEN_GROUPS } from './token-manifest.js';

const read = (name: string) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');

const tokens = read('./tokens.css');
const dark = read('./theme-dark.css');
const light = read('./theme-light.css');

/** Every `--name:` declaration in a stylesheet. */
function declared(css: string): Set<string> {
  return new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((match) => match[1] as string));
}

/** Every `var(--name` reference in a stylesheet. */
function referenced(css: string): Set<string> {
  return new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1] as string));
}

describe('theme parity', () => {
  it('defines the same variables in both themes', () => {
    // A variable present in only one theme shows up as a fallback colour in the other,
    // which reads as "nearly right" and is easy to miss by eye.
    const inDark = declared(dark);
    const inLight = declared(light);

    expect([...inDark].filter((name) => !inLight.has(name))).toEqual([]);
    expect([...inLight].filter((name) => !inDark.has(name))).toEqual([]);
  });

  it('defines every VS Code variable the token layer consumes', () => {
    // Any `--vscode-*` referenced by tokens.css but missing from a theme means the static
    // site silently renders that token's fallback instead of the theme's value. This test
    // caught exactly that on its first run: `--vscode-font-weight` was in neither theme.
    const needed = [...referenced(tokens)].filter((name) => name.startsWith('--vscode-'));
    expect(needed.length).toBeGreaterThan(20);

    const inDark = declared(dark);
    const inLight = declared(light);
    expect(needed.filter((name) => !inDark.has(name))).toEqual([]);
    expect(needed.filter((name) => !inLight.has(name))).toEqual([]);
  });

  it('gives every token a fallback', () => {
    // A token without a fallback renders as nothing at all in a host that supplies neither
    // the VS Code variable nor a theme stylesheet.
    const withoutFallback = [...tokens.matchAll(/^\s*(--apibox-[\w-]+)\s*:\s*var\(([^)]*)\)/gm)]
      .filter(([, , inner]) => !(inner ?? '').includes(','))
      .map(([, name]) => name as string);

    expect(withoutFallback).toEqual([]);
  });

  it('scopes both themes to :root so custom properties resolve', () => {
    // Declared on a descendant, these would not be visible to the `--apibox-*` tokens,
    // which are declared on :root.
    // Quote style is the formatter's business, so match either.
    expect(dark).toMatch(/:root\[data-apibox-theme=['"]dark['"]]/);
    expect(light).toMatch(/:root\[data-apibox-theme=['"]light['"]]/);
  });

  it('sets color-scheme in both themes so native controls follow', () => {
    expect(dark).toMatch(/color-scheme:\s*dark/);
    expect(light).toMatch(/color-scheme:\s*light/);
  });
});

describe('token resolution', () => {
  const tokenDeclarations = parseDeclarations(tokens);
  const themes = {
    dark: parseDeclarations(dark),
    light: parseDeclarations(light),
  };

  for (const [themeName, theme] of Object.entries(themes)) {
    it(`resolves every colour token to a concrete value in the ${themeName} theme`, () => {
      // A token that resolves to nothing renders as nothing. A token that resolves to its
      // own fallback means the theme is missing the variable it points at, so the static
      // site would silently show Dark Modern's colour whatever the theme says.
      const unresolved: string[] = [];
      const fellBackToLiteral: string[] = [];

      for (const name of ALL_COLOUR_TOKENS) {
        const resolved = resolveToken(name, tokenDeclarations, theme);
        if (resolved === undefined) {
          unresolved.push(name);
          continue;
        }
        const declaration = tokenDeclarations.get(name) ?? '';
        const referenced = /var\(\s*(--[\w-]+)/.exec(declaration)?.[1];
        if (referenced && !theme.has(referenced)) fellBackToLiteral.push(name);
      }

      expect(unresolved).toEqual([]);
      expect(fellBackToLiteral).toEqual([]);
    });
  }

  it('resolves the two themes to genuinely different colours', () => {
    // Catches a theme file that was copied and not edited, which the text-level parity
    // tests would happily pass.
    const identical = ALL_COLOUR_TOKENS.filter((name) => {
      const inDark = resolveToken(name, tokenDeclarations, themes.dark);
      const inLight = resolveToken(name, tokenDeclarations, themes.light);
      return inDark !== undefined && inDark === inLight;
    });

    // A handful of tokens legitimately match, such as pure white button text.
    expect(identical.length).toBeLessThan(4);
  });

  it('maps each token to the VS Code variable a reader would expect', () => {
    // Guards against a mapping that is declared and resolvable but simply wrong — for
    // instance a background token pointed at a foreground variable.
    expect(tokenDeclarations.get('--apibox-fg')).toContain('--vscode-foreground');
    expect(tokenDeclarations.get('--apibox-bg')).toContain('--vscode-editor-background');
    expect(tokenDeclarations.get('--apibox-border')).toContain('--vscode-panel-border');
    expect(tokenDeclarations.get('--apibox-accent')).toContain('--vscode-textLink-foreground');
    expect(tokenDeclarations.get('--apibox-focus')).toContain('--vscode-focusBorder');
  });
});

describe('contrast', () => {
  const tokenDeclarations = parseDeclarations(tokens);
  const themes = {
    dark: parseDeclarations(dark),
    light: parseDeclarations(light),
  };
  const textTokens = TOKEN_GROUPS.flatMap((group) =>
    group.tokens.filter((token) => token.usage === 'text').map((token) => token.name),
  );

  for (const [themeName, theme] of Object.entries(themes)) {
    it(`clears WCAG AA for every text token in the ${themeName} theme`, () => {
      // VS Code uses its chart colours for lines and areas, where a lower ratio passes. We
      // use them for text — method labels, status codes — so they have to clear 4.5:1.
      const failures: string[] = [];

      for (const token of textTokens) {
        const colour = resolveToken(token, tokenDeclarations, theme);
        if (colour === undefined) continue;

        for (const surfaceToken of TEXT_SURFACES) {
          const surface = resolveToken(surfaceToken, tokenDeclarations, theme);
          if (surface === undefined) continue;

          const ratio = contrastRatio(colour, surface);
          if (ratio !== undefined && ratio < 4.5) {
            failures.push(
              `${token} (${colour}) on ${surfaceToken} (${surface}): ${ratio.toFixed(2)}`,
            );
          }
        }
      }

      expect(failures).toEqual([]);
    });
  }
});

describe('token manifest', () => {
  it('describes every colour token the stylesheet declares', () => {
    // A token added to tokens.css but not the manifest is undocumented in Storybook and
    // unchecked for contrast, so it must fail here rather than slip through.
    const declaredColours = [...parseDeclarations(tokens).keys()].filter(
      (name) =>
        !name.startsWith('--apibox-space') &&
        !name.startsWith('--apibox-radius') &&
        !name.startsWith('--apibox-font') &&
        !name.startsWith('--apibox-line-height'),
    );
    const described = new Set(ALL_COLOUR_TOKENS);

    expect(declaredColours.filter((name) => !described.has(name))).toEqual([]);
  });

  it('describes no token the stylesheet does not declare', () => {
    const declared = new Set(parseDeclarations(tokens).keys());
    expect(ALL_COLOUR_TOKENS.filter((name) => !declared.has(name))).toEqual([]);
  });
});

describe('token layer', () => {
  it('never hard-codes a colour outside a var() fallback', () => {
    // Components must be able to rely on tokens being theme-derived. A literal outside a
    // fallback position would be a colour no theme can override.
    const outsideFallbacks = tokens.replace(/var\([^)]*\)/g, 'var()').match(/#[0-9a-f]{3,8}\b/gi);

    expect(outsideFallbacks).toBeNull();
  });

  it('exposes only --apibox-* tokens for components to use', () => {
    // Components must never reach for a --vscode-* variable directly; the token layer is
    // the single place that name appears.
    const componentFacing = [...declared(tokens)];
    expect(componentFacing.every((name) => name.startsWith('--apibox-'))).toBe(true);
  });
});
