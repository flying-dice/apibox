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
    min-height: 100%;
    color: var(--apibox-fg);
    background: var(--apibox-bg);
  }

  .with-rail {
    grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr) minmax(10rem, 14rem);
  }

  .sidebar,
  .right-rail {
    position: sticky;
    top: 0;
    align-self: start;
    max-height: 100vh;
    padding: var(--apibox-space-4);
    overflow-y: auto;
    background: var(--apibox-bg-sunken);
  }

  .sidebar {
    border-right: 1px solid var(--apibox-border);
  }

  .right-rail {
    border-left: 1px solid var(--apibox-border);
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
      max-height: none;
      border: 0;
      border-bottom: 1px solid var(--apibox-border);
    }

    .content {
      padding: var(--apibox-space-4);
    }
  }
</style>
