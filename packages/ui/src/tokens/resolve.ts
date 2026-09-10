/**
 * Resolve the token layer the way a browser would, for testing.
 *
 * jsdom does not implement `var()` substitution, so a `getComputedStyle` test would assert
 * nothing. Rather than pull in a real browser for what is fundamentally a static mapping,
 * this resolves the chain — `--apibox-fg` → `var(--vscode-foreground, #cccccc)` → the theme's
 * value — directly from the stylesheets.
 *
 * That is enough to catch the failures that matter: a token pointing at a VS Code variable
 * no theme defines, a light and dark theme that resolve to the same colour, or a palette
 * change that quietly breaks contrast.
 */

/** Parse `--name: value;` declarations out of a stylesheet. */
export function parseDeclarations(css: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const match of css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    declarations.set(match[1] as string, (match[2] as string).trim());
  }
  return declarations;
}

/**
 * Resolve one custom property to a literal value.
 *
 * Returns `undefined` when the chain bottoms out with neither a defined variable nor a
 * fallback — which is the state a component would render as "nothing at all".
 */
export function resolveToken(
  name: string,
  tokens: Map<string, string>,
  theme: Map<string, string>,
  depth = 0,
): string | undefined {
  if (depth > 10) return undefined;

  const raw = theme.get(name) ?? tokens.get(name);
  if (raw === undefined) return undefined;
  return substitute(raw, tokens, theme, depth);
}

function substitute(
  value: string,
  tokens: Map<string, string>,
  theme: Map<string, string>,
  depth: number,
): string | undefined {
  const match = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(value.trim());
  if (!match) return value.trim();

  const [, referenced, fallback] = match;
  const resolved = resolveToken(referenced as string, tokens, theme, depth + 1);
  if (resolved !== undefined) return resolved;
  return fallback === undefined ? undefined : substitute(fallback, tokens, theme, depth + 1);
}

/* -------------------------------------------------------------------------- */
/* Contrast                                                                    */
/* -------------------------------------------------------------------------- */

export function parseHex(colour: string): [number, number, number] | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (!match) return undefined;

  let digits = match[1] as string;
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((digit) => digit + digit)
      .join('');
  }
  const value = Number.parseInt(digits, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Relative luminance, per WCAG 2.1. */
export function luminance(colour: string): number | undefined {
  const rgb = parseHex(colour);
  if (!rgb) return undefined;

  const [r, g, b] = rgb.map((channel) => {
    const normalised = channel / 255;
    return normalised <= 0.03928 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, or `undefined` if either cannot be parsed. */
export function contrastRatio(a: string, b: string): number | undefined {
  const first = luminance(a);
  const second = luminance(b);
  if (first === undefined || second === undefined) return undefined;

  const [lighter, darker] = first > second ? [first, second] : [second, first];
  return (lighter + 0.05) / (darker + 0.05);
}
