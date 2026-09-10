<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * A link.
   *
   * External links get a marker and `rel="noreferrer"`, because documentation routinely
   * links out to specifications and provider portals, and inside a VS Code webview a link
   * that leaves the editor should say so before it is clicked.
   */
  interface Props {
    href: string;
    /** Detected from the href when not given. */
    external?: boolean;
    title?: string;
    testId?: string;
    children: Snippet;
  }

  const { href, external, title, testId, children }: Props = $props();

  const isExternal = $derived(external ?? /^https?:\/\//i.test(href));
</script>

<a
  class="link"
  {href}
  {title}
  target={isExternal ? '_blank' : undefined}
  rel={isExternal ? 'noreferrer noopener' : undefined}
  data-testid={testId}
  data-external={isExternal ? 'true' : undefined}
>
  {@render children()}
  {#if isExternal}
    <Icon
      name="link-external"
      size={12}
      testId={testId ? `${testId}-external-marker` : 'link-external-marker'}
    />
  {/if}
</a>

<style>
  .link {
    display: inline-flex;
    gap: var(--apibox-space-1);
    align-items: center;
    color: var(--apibox-accent);
    text-decoration: none;
  }

  .link:hover {
    color: var(--apibox-accent-hover);
    text-decoration: underline;
  }
</style>
