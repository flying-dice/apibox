<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * A labelled value: `Version 1.4.0`, `License MIT`, `Content type application/json`.
   *
   * A definition list rather than a table, because these are pairs and not rows — a table
   * would announce phantom columns to a screen reader.
   */
  interface Props {
    label: string;
    testId?: string;
    children: Snippet;
  }

  const { label, testId, children }: Props = $props();
</script>

<div class="row" data-testid={testId ?? `kv-${label.toLowerCase().replace(/\s+/g, '-')}`}>
  <dt class="label">{label}</dt>
  <dd class="value">{@render children()}</dd>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(6rem, 12rem) 1fr;
    gap: var(--apibox-space-3);
    align-items: baseline;
    padding: var(--apibox-space-2) 0;
  }

  .label {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }

  .value {
    min-width: 0;
    margin: 0;
  }

  @media (width <= 32rem) {
    .row {
      grid-template-columns: 1fr;
      gap: var(--apibox-space-1);
    }
  }
</style>
