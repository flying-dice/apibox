import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import {
  TEST_ID_HTML_ATTRIBUTES,
  TEST_ID_HTML_ELEMENTS,
  TEST_ID_INTERACTIVE_COMPONENTS,
} from '../../../tests/testid-policy.js';
import type { BadgeTone } from './atoms/tone.js';
import { toneToken } from './atoms/tone.js';
import { parseDeclarations } from './tokens/resolve.js';

/**
 * Enforcement for the rules in `docs/03-theming.md`.
 *
 * These rules are easy to state and easy to break by accident — a hex value pasted from a
 * mock-up, a `--vscode-*` reached for because the right token did not exist yet. Either
 * produces a component that looks correct in the theme it was written against and wrong in
 * every other one, which is exactly the sort of thing nobody notices until a user reports it.
 */

// Resolved from the working directory rather than `import.meta.url`: under jsdom the module
// URL is not always a `file:` URL, and this walks the source tree rather than importing it.
const SRC = join(process.cwd(), 'src');
const TOKENS_CSS = readFileSync(join(SRC, 'tokens/tokens.css'), 'utf8');

/**
 * Every component `.svelte` file under `src`.
 *
 * Excludes the token layer, which is the one place `--vscode-*` and colour literals belong,
 * and stories, which are documentation rather than shipped components — a story is allowed
 * to lay out a demo sheet without carrying a test hook.
 */
function componentFiles(directory = SRC): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return componentFiles(path);
    const isComponent = path.endsWith('.svelte') && !path.endsWith('.stories.svelte');
    return isComponent && !path.includes('/tokens/') && !path.includes('/test/') ? [path] : [];
  });
}

const components = componentFiles();

function testFiles(directory = SRC): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return testFiles(path);
    return path.endsWith('.test.ts') ? [path] : [];
  });
}

describe('design language enforcement', () => {
  it('finds the components it is meant to be checking', () => {
    // A guard against the walker silently matching nothing and the suite passing vacuously.
    expect(components.length).toBeGreaterThan(5);
  });

  it('never references a --vscode-* variable outside the token layer', () => {
    // The token layer is the single place that name appears. A component reaching straight
    // for a VS Code variable bypasses the fallbacks and the contrast checks.
    const offenders = components.filter((path) => readFileSync(path, 'utf8').includes('--vscode-'));
    expect(offenders.map(relative)).toEqual([]);
  });

  it('never hard-codes a colour', () => {
    // Includes hex, rgb()/rgba() and hsl(). `currentColor` and `transparent` are fine:
    // both inherit from whatever token the context set.
    const offenders: string[] = [];
    for (const path of components) {
      const source = readFileSync(path, 'utf8');
      const matches = [
        ...(source.match(/#[0-9a-f]{3,8}\b/gi) ?? []),
        ...(source.match(/\b(?:rgba?|hsla?)\s*\(/gi) ?? []),
      ];
      if (matches.length > 0) offenders.push(`${relative(path)}: ${matches.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('only uses --apibox-* tokens that actually exist', () => {
    // A typo in a token name fails silently in CSS: the property simply does not apply.
    const declared = new Set(parseDeclarations(TOKENS_CSS).keys());
    const unknown = new Set<string>();

    for (const path of components) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/var\(\s*(--apibox-[\w-]+)/g)) {
        const name = match[1] as string;
        if (!declared.has(name)) unknown.add(`${relative(path)}: ${name}`);
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it('gives every component a test hook', () => {
    // Tests select by data-testid only, never by class or visible text, because the UI is
    // themed through CSS variables and renders spec-supplied text — both alternatives
    // couple tests to things that change for unrelated reasons. See docs/04-testing.md.
    //
    // A component satisfies this either by setting `data-testid` on an element of its own,
    // or by forwarding `testId` into a child component that does. Merely mentioning the
    // word `testId` is not enough.
    const missing = components.filter((path) => {
      const source = readFileSync(path, 'utf8');
      const setsOwn = source.includes('data-testid=');
      const forwards = /testId=\{|testId="|\btestId\b\s*$/m.test(source);
      return !setsOwn && !forwards;
    });
    expect(missing.map(relative)).toEqual([]);
  });

  it('gives every semantic element and interactive component its own test hook', () => {
    const semanticElements = new Set<string>(TEST_ID_HTML_ELEMENTS);
    const semanticAttributes = new Set<string>(TEST_ID_HTML_ATTRIBUTES);
    const interactiveComponents = new Set<string>(TEST_ID_INTERACTIVE_COMPONENTS);
    const missing: string[] = [];

    for (const path of components) {
      const source = readFileSync(path, 'utf8');
      const root = parse(source, { modern: true });
      visit(root.fragment, (node) => {
        if (!isRecord(node) || (node.type !== 'RegularElement' && node.type !== 'Component')) {
          return;
        }
        const name = typeof node.name === 'string' ? node.name : '';
        const hasSemanticAttribute = [...semanticAttributes].some((attribute) =>
          hasAttribute(node, attribute),
        );
        const requiresHook =
          (node.type === 'RegularElement' &&
            (semanticElements.has(name) || hasSemanticAttribute)) ||
          (node.type === 'Component' && interactiveComponents.has(name));
        if (
          !requiresHook ||
          hasAttribute(node, node.type === 'Component' ? 'testId' : 'data-testid')
        ) {
          return;
        }
        const start = typeof node.start === 'number' ? node.start : 0;
        const line = source.slice(0, start).split('\n').length;
        missing.push(`${relative(path)}:${line} <${name}>`);
      });
    }

    expect(missing).toEqual([]);
  });

  it('uses test-id selectors throughout component tests', () => {
    const forbiddenSelectors = /\b(?:get|query|find)(?:All)?By(?!TestId\b)[A-Z]\w*/g;
    const offenders = testFiles().flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return [...source.matchAll(forbiddenSelectors)].map(
        (match) =>
          `${relative(path)}:${source.slice(0, match.index).split('\n').length} ${match[0]}`,
      );
    });
    expect(offenders).toEqual([]);
  });

  it('resolves every badge tone to a token that exists', () => {
    // Badge builds its custom property at runtime — `var(--apibox-{toneToken(tone)})` — so
    // the static scan above cannot see it. A tone mapping to a token that does not exist
    // produces an uncoloured badge and no error anywhere.
    const declared = new Set(parseDeclarations(TOKENS_CSS).keys());
    const tones: BadgeTone[] = [
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
      'accent',
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'head',
      'options',
      'trace',
      'send',
      'receive',
      'rpc',
    ];

    const missing = tones
      .map((tone) => `--apibox-${toneToken(tone)}`)
      .filter((name) => !declared.has(name));

    expect(missing).toEqual([]);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasAttribute(node: Record<string, unknown>, name: string): boolean {
  if (!Array.isArray(node.attributes)) return false;
  return node.attributes.some(
    (attribute) => isRecord(attribute) && attribute.type === 'Attribute' && attribute.name === name,
  );
}

function visit(value: unknown, callback: (node: unknown) => void, seen = new Set<object>()): void {
  if (!isRecord(value) || seen.has(value)) return;
  seen.add(value);
  callback(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) visit(item, callback, seen);
    } else {
      visit(child, callback, seen);
    }
  }
}

function relative(path: string): string {
  return path.slice(SRC.length);
}
