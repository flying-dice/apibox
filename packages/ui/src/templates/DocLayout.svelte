<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    sidebar: Snippet;
    children: Snippet;
    rightRail?: Snippet;
    testId?: string;
  }

  const { sidebar, children, rightRail, testId = 'doc-layout' }: Props = $props();
</script>

<div class="layout" class:with-rail={Boolean(rightRail)} data-testid={testId}>
  <aside class="sidebar" aria-label="Documentation navigation" data-testid="{testId}-sidebar">
    {@render sidebar()}
  </aside>
  <main class="content" data-testid="{testId}-content">{@render children()}</main>
  {#if rightRail}
    <aside class="right-rail" aria-label="On this page" data-testid="{testId}-right-rail">
      {@render rightRail()}
    </aside>
  {/if}
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr);
    min-height: 100vh;
    min-height: 100dvh;
    color: var(--apibox-fg);
    background: var(--apibox-bg);
  }

  .with-rail {
    grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr) minmax(10rem, 14rem);
  }

  .right-rail {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    height: 100dvh;
    padding: var(--apibox-space-4);
    overflow-y: auto;
    background: var(--apibox-bg-sunken);
    border-left: 1px solid var(--apibox-border);
  }

  /*
   * The sidebar is a floating card, not a full-height rail: it follows the height of its own
   * navigation and caps out rather than stretching an empty sunken column on short documents.
   * The margin on every side is what makes it read as a card on the page background, so the
   * sticky offset and max-height both have to account for it.
   */
  .sidebar {
    position: sticky;
    top: var(--apibox-space-4);
    align-self: start;
    max-height: calc(100vh - var(--apibox-space-4) * 2);
    max-height: calc(100dvh - var(--apibox-space-4) * 2);
    margin: var(--apibox-space-4);
    padding: var(--apibox-space-4);
    overflow-y: auto;
    background: var(--apibox-bg-sunken);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .content {
    min-width: 0;
    padding: var(--apibox-space-6);
  }

  @media (width <= 64rem) {
    .with-rail {
      grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr);
    }

    .right-rail {
      display: none;
    }
  }

  @media (width <= 44rem) {
    .layout,
    .with-rail {
      grid-template-columns: 1fr;
    }

    .sidebar,
    .right-rail {
      position: static;
      display: block;
      height: auto;
      max-height: none;
      margin: 0;
      border: 0;
      border-radius: 0;
      border-bottom: 1px solid var(--apibox-border);
    }

    .content {
      padding: var(--apibox-space-4);
    }
  }
</style>
