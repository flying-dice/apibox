<script lang="ts">
  import type { MediaTypeBody } from '@apibox/core';
  import Chip from '../atoms/Chip.svelte';
  import TabBar from '../molecules/TabBar.svelte';
  import ExampleViewer from './ExampleViewer.svelte';
  import { createIndexedSelection } from './indexed-selection.svelte.js';
  import SchemaViewer from './SchemaViewer.svelte';

  interface Props {
    content: readonly MediaTypeBody[];
    testId?: string;
  }

  const { content, testId = 'media' }: Props = $props();

  const selection = createIndexedSelection(() => content);
  const selected = $derived(content[selection.index]);
  const tabs = $derived(
    content.map((media, index) => ({ id: String(index), label: media.contentType })),
  );
</script>

{#if content.length === 0}
  <p class="empty" data-testid="{testId}-empty">No content was declared.</p>
{:else if selected}
  <section class="media" aria-label="Content" data-testid={testId}>
    {#if content.length > 1}
      <TabBar
        {tabs}
        selected={String(selection.index)}
        label="Media type"
        panelId="{testId}-panel"
        testId="{testId}-tabs"
        onselect={selection.select}
      />
    {:else}
      <code class="content-type" data-testid="{testId}-content-type">{selected.contentType}</code>
    {/if}

    <div
      id="{testId}-panel"
      class="panel"
      role={content.length > 1 ? 'tabpanel' : undefined}
      aria-labelledby={content.length > 1 ? `${testId}-tabs-tab-${selection.index}` : undefined}
      data-testid="{testId}-panel"
    >
      <SchemaViewer schema={selected.schema} testId="{testId}-schema" />
      {#if selected.encoding?.length}
        <section class="encoding" aria-label="Part encoding" data-testid="{testId}-encoding">
          <h4>Encoding</h4>
          {#each selected.encoding as entry (entry.propertyName)}
            <div class="encoding-entry" data-testid="{testId}-encoding-{entry.propertyName}">
              <code class="property">{entry.propertyName}</code>
              <div class="chips">
                {#if entry.contentType}
                  <Chip
                    label="content type"
                    value={entry.contentType}
                    code
                    testId="{testId}-encoding-{entry.propertyName}-content-type"
                  />
                {/if}
                {#if entry.style?.declared}
                  <Chip
                    label="style"
                    value={entry.style.value}
                    testId="{testId}-encoding-{entry.propertyName}-style"
                  />
                {/if}
                {#if entry.explode?.declared}
                  <Chip
                    label="explode"
                    value={String(entry.explode.value)}
                    testId="{testId}-encoding-{entry.propertyName}-explode"
                  />
                {/if}
                {#if entry.allowReserved}
                  <Chip
                    label="allowReserved"
                    value="true"
                    testId="{testId}-encoding-{entry.propertyName}-allow-reserved"
                  />
                {/if}
              </div>
            </div>
          {/each}
        </section>
      {/if}
      {#if selected.examples?.length}
        <ExampleViewer examples={selected.examples} testId="{testId}-examples" />
      {/if}
    </div>
  </section>
{/if}

<style>
  .media,
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
  }

  .content-type {
    width: fit-content;
    padding: var(--apibox-space-1) var(--apibox-space-2);
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
    color: var(--apibox-fg-muted);
    background: var(--apibox-bg-code);
    border-radius: var(--apibox-radius);
  }

  .empty {
    margin: 0;
    color: var(--apibox-fg-muted);
  }

  .encoding {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }

  .encoding h4 {
    margin: 0;
  }

  .encoding-entry {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  .property {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
