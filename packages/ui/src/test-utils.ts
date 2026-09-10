import type { Snippet } from 'svelte';
import { createRawSnippet } from 'svelte';

/**
 * Test helpers.
 *
 * Svelte 5 children are snippets, not strings, so a test cannot simply pass `'Copy'` where
 * a component expects `children`. `createRawSnippet` is the supported way to build one
 * outside a `.svelte` file.
 */

/** A snippet rendering plain text, for components that take `children`. */
export function text(value: string): Snippet {
  return createRawSnippet(() => ({
    render: () => `<span>${escapeHtml(value)}</span>`,
  })) as Snippet;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
