<script lang="ts">
  import type { MediaTypeBody } from '@apibox/core';
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
</style>
