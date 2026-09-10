<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * A button.
   *
   * Documentation is mostly read, not operated, so `ghost` is the default: copy buttons,
   * expand toggles and tab-like controls should recede until wanted. `primary` exists for
   * the few genuinely primary actions a host might add.
   */
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'small' | 'medium';
    type?: 'button' | 'submit';
    disabled?: boolean;
    /** Accessible name; required when the content is only an icon. */
    label?: string;
    title?: string;
    pressed?: boolean;
    testId?: string;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
  }

  const {
    variant = 'ghost',
    size = 'medium',
    type = 'button',
    disabled = false,
    label,
    title,
    pressed,
    testId,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  class="button {variant} {size}"
  {type}
  {disabled}
  {title}
  aria-label={label}
  aria-pressed={pressed}
  data-testid={testId}
  {onclick}
>
  {@render children()}
</button>

<style>
  .button {
    display: inline-flex;
    gap: var(--apibox-space-2);
    align-items: center;
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg);
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--apibox-radius);
  }

  .medium {
    padding: var(--apibox-space-2) var(--apibox-space-3);
  }

  .small {
    padding: var(--apibox-space-1) var(--apibox-space-2);
    font-size: var(--apibox-font-size-sm);
  }

  .primary {
    color: var(--apibox-fg-on-accent);
    background: var(--apibox-button-bg);
  }

  .primary:hover:not(:disabled) {
    background: var(--apibox-button-bg-hover);
  }

  .secondary {
    border-color: var(--apibox-border-strong);
  }

  .secondary:hover:not(:disabled),
  .ghost:hover:not(:disabled) {
    background: var(--apibox-bg-hover);
  }

  .button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .button[aria-pressed='true'] {
    background: var(--apibox-bg-hover);
  }
</style>
