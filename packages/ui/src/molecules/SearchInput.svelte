<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  /**
   * The sidebar filter.
   *
   * Escape clears rather than only blurring: with a filter applied the sidebar is showing a
   * subset, and the fastest way back to the whole document should not require selecting
   * text and deleting it.
   */
  interface Props {
    value: string;
    placeholder?: string;
    label?: string;
    testId?: string;
    onchange: (value: string) => void;
  }

  const {
    value,
    placeholder = 'Filter…',
    label = 'Filter operations',
    testId = 'search',
    onchange,
  }: Props = $props();

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && value !== '') {
      event.preventDefault();
      // Stop the webview host from also acting on Escape.
      event.stopPropagation();
      onchange('');
    }
  }
</script>

<div class="search" data-testid={testId}>
  <Icon name="search" size={13} testId="{testId}-icon" />
  <input
    class="input"
    type="search"
    {value}
    {placeholder}
    aria-label={label}
    data-testid="{testId}-input"
    oninput={(event) => onchange(event.currentTarget.value)}
    {onkeydown}
  />
  {#if value}
    <Button size="small" label="Clear filter" testId="{testId}-clear" onclick={() => onchange('')}>
      <Icon name="close" size={12} testId="{testId}-clear-icon" />
    </Button>
  {/if}
</div>

<style>
  .search {
    display: flex;
    gap: var(--apibox-space-2);
    align-items: center;
    padding: 0 var(--apibox-space-2);
    color: var(--apibox-fg-muted);
    background: var(--apibox-bg-input);
    border: 1px solid var(--apibox-border-input);
    border-radius: var(--apibox-radius);
  }

  .search:focus-within {
    border-color: var(--apibox-focus);
  }

  .input {
    flex: 1;
    min-width: 0;
    padding: var(--apibox-space-2) 0;
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg);
    background: transparent;
    border: none;
  }

  .input:focus {
    outline: none;
  }

  /* The native clear affordance duplicates our own button and ignores the theme. */
  .input::-webkit-search-cancel-button {
    display: none;
  }
</style>
