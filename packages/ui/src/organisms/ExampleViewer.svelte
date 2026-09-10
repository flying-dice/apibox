<script lang="ts">
  import type { ExampleValue } from '@apibox/core';
  import { formatJson } from '../format-json.js';
  import CodeBlock from '../molecules/CodeBlock.svelte';
  import TabBar from '../molecules/TabBar.svelte';
  import { createIndexedSelection } from './indexed-selection.svelte.js';

  interface Props {
    examples: readonly ExampleValue[];
    testId?: string;
  }

  const { examples, testId = 'examples' }: Props = $props();

  const selection = createIndexedSelection(() => examples);
  const selected = $derived(examples[selection.index]);
  const tabs = $derived(examples.map((example, index) => ({ id: String(index), label: example.name })));

</script>

{#if examples.length > 0 && selected}
  <section class="examples" aria-label="Examples" data-testid={testId}>
    {#if examples.length > 1}
      <TabBar
        {tabs}
        selected={String(selection.index)}
        label="Examples"
        panelId="{testId}-panel"
        testId="{testId}-tabs"
        onselect={selection.select}
      />
    {/if}

    <div
      id="{testId}-panel"
      role={examples.length > 1 ? 'tabpanel' : undefined}
      aria-labelledby={examples.length > 1 ? `${testId}-tabs-tab-${selection.index}` : undefined}
      data-testid="{testId}-panel"
    >
      {#if selected.summary}<p class="summary">{selected.summary}</p>{/if}
      {#if selected.description}<p class="description">{selected.description}</p>{/if}
      <CodeBlock
        code={formatJson(selected.value, 'This example could not be serialized as JSON.')}
        language="json"
        label={selected.name}
        maxLines={18}
        testId="{testId}-code"
      />
    </div>
  </section>
{/if}

<style>
  .examples {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  .summary,
  .description {
    margin: 0 0 var(--apibox-space-3);
  }

  .summary {
    font-weight: var(--apibox-font-weight-bold);
  }

  .description {
    color: var(--apibox-fg-muted);
  }
</style>
