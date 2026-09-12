<script lang="ts">
  import type { ExampleValue, NavNode } from '@apibox/core';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import { formatJson } from '../../format-json.js';
  import CodeBlock from '../../molecules/CodeBlock.svelte';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';

  /**
   * Named entries under `components.examples` -- the plain Example Object shape (a name
   * plus a literal `value` or an `externalValue`), distinct from the params/result pairing
   * shape `RpcExamplePairingCatalog` renders. Same catalogue treatment as
   * `RpcContentDescriptorCatalog`: independent of whether any method references an entry.
   */
  interface Props {
    examples: readonly ExampleValue[];
    navigation?: NavNode;
    testId?: string;
  }

  const { examples, navigation, testId = 'example-catalog' }: Props = $props();
</script>

{#if examples.length > 0}
  <section
    id={navigation?.id ?? 'example-catalog'}
    class="examples"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title" data-testid="{testId}-title">Examples</h2>
    {#each examples as example, index (index)}
      <CollapsibleCard
        id={navigation?.children?.[index]?.id ?? `example-catalog-${index}`}
        testId="{testId}-{index}"
      >
        {#snippet summary()}
          <span data-testid="{testId}-{index}-name">{example.name}</span>
        {/snippet}
        {#if example.summary || example.description}
          <p data-testid="{testId}-{index}-description">
            {#if example.summary}<strong>{example.summary}</strong>{/if}
            {#if example.summary && example.description}&nbsp;&mdash;&nbsp;{/if}
            {example.description ?? ''}
          </p>
        {/if}
        {#if example.value !== undefined}
          <CodeBlock
            code={formatJson(example.value, 'This value could not be serialized as JSON.')}
            language="json"
            testId="{testId}-{index}-value"
          />
        {:else if example.externalValue}
          <p class="external" data-testid="{testId}-{index}-external-value">
            <Link href={example.externalValue} testId="{testId}-{index}-external-value-link">
              {example.externalValue}
            </Link>
          </p>
        {/if}
        {#if example.extensions?.length}
          <div class="extensions" data-testid="{testId}-{index}-extensions">
            {#each example.extensions as extension (extension.key)}
              <Chip
                label={extension.key}
                value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
                code
                testId="{testId}-{index}-extension-{extension.key}"
              />
            {/each}
          </div>
        {/if}
      </CollapsibleCard>
    {/each}
  </section>
{/if}

<style>
  /* No gap between rows: the hairline in CollapsibleCard carries the separation -- same
     density convention as SchemaCatalog and RpcContentDescriptorCatalog. */
  .examples {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  h2 {
    margin: 0 0 var(--apibox-space-4);
  }

  p {
    margin: 0;
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
