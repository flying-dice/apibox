<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Inline code: a path, a property name, a media type.
   *
   * Deliberately quiet — no background by default. Documentation is dense with identifiers,
   * and giving every one a filled chip turns a paragraph into confetti. The `boxed` variant
   * is for the rarer case where an identifier has to be picked out of prose.
   */
  interface Props {
    boxed?: boolean;
    muted?: boolean;
    testId?: string;
    children: Snippet;
  }

  const { boxed = false, muted = false, testId, children }: Props = $props();
</script>

<code class="code" class:boxed class:muted data-testid={testId}>{@render children()}</code>

<style>
  .code {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
    word-break: break-word;
  }

  .boxed {
    padding: 0 var(--apibox-space-2);
    background: var(--apibox-bg-code);
    border-radius: var(--apibox-radius);
  }

  .muted {
    color: var(--apibox-fg-muted);
  }
</style>
