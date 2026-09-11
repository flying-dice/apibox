<script lang="ts">
  import Badge from '../atoms/Badge.svelte';
  import type { BadgeTone } from '../atoms/tone.js';

  /**
   * One row in the sidebar.
   *
   * An anchor rather than a button, because every section of a document has a real URL —
   * deep links have to work in the static site and survive a reload in the webview. Using a
   * button would mean reimplementing middle-click, copy-link and open-in-new-tab by hand.
   */
  interface Props {
    href: string;
    label: string;
    badge?: string;
    badgeTone?: BadgeTone;
    current?: boolean;
    deprecated?: boolean;
    /** Indentation level within the tree. */
    depth?: number;
    testId?: string;
    onnavigate?: (href: string) => void;
  }

  const {
    href,
    label,
    badge,
    badgeTone = 'neutral',
    current = false,
    deprecated = false,
    depth = 0,
    testId,
    onnavigate,
  }: Props = $props();
</script>

<a
  class="item"
  class:current
  class:deprecated
  {href}
  style="--depth: {depth}"
  aria-current={current ? 'true' : undefined}
  title={label}
  data-testid={testId}
  onclick={(event) => {
    // Leave every modified click to the browser: cmd/ctrl opens a new tab, shift a new
    // window, and alt downloads the target. Handling any of them here would fire a router
    // navigation alongside the browser's own action.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (onnavigate) {
      event.preventDefault();
      onnavigate(href);
    }
  }}
>
  {#if badge}
    <Badge tone={badgeTone} small {deprecated} testId={testId ? `${testId}-badge` : undefined}>
      {badge}
    </Badge>
  {/if}
  <span class="label">{label}</span>
</a>

<style>
  .item {
    display: flex;
    gap: var(--apibox-space-2);
    align-items: center;
    padding: var(--apibox-space-1) var(--apibox-space-3);
    padding-left: calc(var(--apibox-space-3) + var(--depth) * var(--apibox-space-4));
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg);
    text-decoration: none;
    border-radius: var(--apibox-radius);
  }

  .item:hover {
    color: var(--apibox-fg);
    text-decoration: none;
    background: var(--apibox-bg-hover);
  }

  .current {
    color: var(--apibox-fg-active);
    background: var(--apibox-bg-active);
  }

  .item:hover,
  .current {
    outline: 1px dashed var(--apibox-border-active);
    outline-offset: -1px;
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .deprecated .label {
    color: var(--apibox-fg-muted);
    text-decoration: line-through;
  }
</style>
