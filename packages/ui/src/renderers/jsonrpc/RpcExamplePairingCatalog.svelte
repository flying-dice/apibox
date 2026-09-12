<script lang="ts">
  import type { NavNode, RpcExample } from '@apibox/core';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';
  import RpcExamplePair from './RpcExamplePair.svelte';

  /**
   * Named entries under `components.examplePairings` -- the same params/result pairing
   * shape a method's own `examples` already uses (`RpcExamplePair` renders both). A
   * catalogue entry has no method of its own to build a realistic JSON-RPC envelope
   * around, unlike a method's own example, so the envelope shows a placeholder method
   * name rather than inventing one.
   */
  interface Props {
    examplePairings: readonly RpcExample[];
    navigation?: NavNode;
    testId?: string;
  }

  const { examplePairings, navigation, testId = 'example-pairing-catalog' }: Props = $props();
</script>

{#if examplePairings.length > 0}
  <section
    id={navigation?.id ?? 'example-pairing-catalog'}
    class="pairings"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title" data-testid="{testId}-title">Example Pairings</h2>
    {#each examplePairings as example, index (index)}
      <CollapsibleCard
        id={navigation?.children?.[index]?.id ?? `example-pairing-catalog-${index}`}
        testId="{testId}-{index}"
      >
        {#snippet summary()}
          <span data-testid="{testId}-{index}-name">{example.name}</span>
        {/snippet}
        <RpcExamplePair
          {example}
          methodName="(unspecified method)"
          testId="{testId}-{index}-pair"
        />
      </CollapsibleCard>
    {/each}
  </section>
{/if}

<style>
  /* No gap between rows: the hairline in CollapsibleCard carries the separation -- same
     density convention as SchemaCatalog and RpcContentDescriptorCatalog. */
  .pairings {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  h2 {
    margin: 0 0 var(--apibox-space-4);
  }
</style>
