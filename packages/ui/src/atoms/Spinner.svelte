<script lang="ts">
  /**
   * An indeterminate progress indicator, for a document still being parsed.
   *
   * Honours `prefers-reduced-motion` by falling back to a static ring — a spinner is
   * decoration, and decoration should never be the reason someone cannot use the page.
   */
  interface Props {
    size?: number;
    label?: string;
    testId?: string;
  }

  const { size = 16, label = 'Loading', testId = 'spinner' }: Props = $props();
</script>

<span
  class="spinner"
  style="--size: {size}px"
  role="status"
  aria-label={label}
  data-testid={testId}
></span>

<style>
  .spinner {
    display: inline-block;
    width: var(--size);
    height: var(--size);
    border: 2px solid color-mix(in srgb, var(--apibox-fg) 25%, transparent);
    border-top-color: var(--apibox-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
