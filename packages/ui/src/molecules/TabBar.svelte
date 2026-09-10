<script lang="ts">
  /**
   * A tab strip, for switching between media types or example variants.
   *
   * Implements the ARIA tabs pattern properly, which is more than colouring the selected
   * tab: arrow keys move *focus* as well as selection, Home and End jump to the ends, and
   * each tab points at the panel it controls. A reader comparing a JSON and an XML
   * representation of the same body moves between them repeatedly, so this has to work
   * without a mouse.
   */
  export interface Tab {
    id: string;
    label: string;
    /** Optional count or annotation shown after the label. */
    badge?: string;
  }

  interface Props {
    tabs: Tab[];
    selected: string;
    /** Accessible name for the strip, e.g. 'Media type'. */
    label: string;
    /**
     * `id` of the element showing the selected tab's content.
     *
     * The consumer renders that element with `role="tabpanel"` and
     * `aria-labelledby={tabId(selected)}`; without it assistive technology cannot connect a
     * tab to what it reveals. {@link tabId} builds the matching id.
     */
    panelId?: string;
    testId?: string;
    onselect: (id: string) => void;
  }

  const { tabs, selected, label, panelId, testId = 'tab-bar', onselect }: Props = $props();

  /** The DOM id of a tab button, for a panel's `aria-labelledby`. */
  export function tabId(id: string): string {
    return `${testId}-tab-${id}`;
  }

  function onkeydown(event: KeyboardEvent) {
    const index = tabs.findIndex((tab) => tab.id === selected);
    if (index < 0) return;

    const next = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;

    event.preventDefault();
    // Wrap, so the strip has no dead ends.
    const target = tabs[(next + tabs.length) % tabs.length];
    if (!target) return;

    onselect(target.id);

    // Selection alone is not enough: with a roving tabindex, focus left behind on a
    // `tabindex="-1"` tab strands the keyboard user. Move it to the tab now selected.
    const element = event.currentTarget as HTMLElement;
    const button = element.closest('[role="tablist"]')?.querySelector<HTMLElement>(
      `#${CSS.escape(tabId(target.id))}`,
    );
    button?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label={label} data-testid={testId}>
  {#each tabs as tab (tab.id)}
    <button
      class="tab"
      class:selected={tab.id === selected}
      type="button"
      role="tab"
      id={tabId(tab.id)}
      aria-selected={tab.id === selected}
      aria-controls={panelId}
      tabindex={tab.id === selected ? 0 : -1}
      data-testid={tabId(tab.id)}
      onclick={() => onselect(tab.id)}
      {onkeydown}
    >
      {tab.label}
      {#if tab.badge}<span class="badge">{tab.badge}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--apibox-space-1);
    overflow-x: auto;
    border-bottom: 1px solid var(--apibox-border);
  }

  .tab {
    padding: var(--apibox-space-2) var(--apibox-space-3);
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg-muted);
    white-space: nowrap;
    cursor: pointer;
    background: transparent;
    border: none;
    /* Reserve the indicator's space so selecting a tab does not shift the strip. */
    border-bottom: 1px solid transparent;
  }

  .tab:hover {
    color: var(--apibox-fg);
  }

  .selected {
    color: var(--apibox-fg);
    border-bottom-color: var(--apibox-accent);
  }

  .badge {
    margin-left: var(--apibox-space-2);
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }
</style>
