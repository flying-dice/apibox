<script lang="ts">
  import type { Snippet } from 'svelte';
  import { type BadgeTone, toneToken } from './tone.js';

  export type BadgeVariant = 'solid' | 'soft' | 'outline';

  /**
   * A short coloured label: an HTTP method, a status code, an operation direction.
   *
   * Tone is the only colour input, and it names a semantic token rather than a colour, so a
   * badge stays legible in any VS Code theme. The `soft` variant derives its background
   * from that same token with `color-mix`, which keeps one source of truth per tone instead
   * of a second set of background tokens to keep in step.
   */
  interface Props {
    tone?: BadgeTone;
    variant?: BadgeVariant;
    /** Renders in the smaller metadata size. */
    small?: boolean;
    /** Dims the badge and adds a strikethrough, for deprecated operations. */
    deprecated?: boolean;
    title?: string;
    testId?: string;
    children: Snippet;
  }

  const {
    tone = 'neutral',
    variant = 'soft',
    small = false,
    deprecated = false,
    title,
    testId,
    children,
  }: Props = $props();
</script>

<span
  class="badge {variant}"
  class:small
  class:deprecated
  style="--tone: var(--apibox-{toneToken(tone)})"
  data-tone={tone}
  data-testid={testId}
  {title}
>
  {@render children()}
</span>


<style>
  .badge {
    display: inline-flex;
    gap: var(--apibox-space-2);
    align-items: center;
    padding: 0 var(--apibox-space-2);
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size-sm);
    font-weight: var(--apibox-font-weight-bold);
    line-height: 1.6;
    white-space: nowrap;
    border-radius: var(--apibox-radius);
  }

  .small {
    font-size: calc(var(--apibox-font-size-sm) - 1px);
  }

  .soft {
    color: var(--tone);
    /* 18% keeps the fill readable in both themes without a second token per tone. */
    background: color-mix(in srgb, var(--tone) 18%, transparent);
  }

  .solid {
    color: var(--apibox-fg-on-accent);
    background: var(--tone);
  }

  .outline {
    color: var(--tone);
    background: transparent;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 55%, transparent);
  }

  .deprecated {
    opacity: 0.65;
    text-decoration: line-through;
  }
</style>
