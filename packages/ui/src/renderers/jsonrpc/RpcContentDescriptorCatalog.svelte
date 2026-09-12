<script lang="ts">
  import type { NavNode, RpcParam } from '@apibox/core';
  import Badge from '../../atoms/Badge.svelte';
  import Chip from '../../atoms/Chip.svelte';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';
  import SchemaViewer from '../../organisms/SchemaViewer.svelte';

  interface Props {
    contentDescriptors: readonly RpcParam[];
    navigation?: NavNode;
    testId?: string;
  }

  const {
    contentDescriptors,
    navigation,
    testId = 'content-descriptor-catalog',
  }: Props = $props();
</script>

{#if contentDescriptors.length > 0}
  <section
    id={navigation?.id ?? 'content-descriptors'}
    class="descriptors"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title" data-testid="{testId}-title">Content Descriptors</h2>
    {#each contentDescriptors as descriptor, index (index)}
      <CollapsibleCard
        id={navigation?.children?.[index]?.id ?? `content-descriptor-${index}`}
        testId="{testId}-{index}"
      >
        {#snippet summary()}
          <span data-testid="{testId}-{index}-name">
            {descriptor.name}{descriptor.required ? ' · required' : ''}
          </span>
          {#if descriptor.deprecated}
            <Badge tone="warning" variant="outline" small testId="{testId}-{index}-deprecated">
              deprecated
            </Badge>
          {/if}
        {/snippet}
        {#if descriptor.summary || descriptor.description}
          <p data-testid="{testId}-{index}-description">
            {#if descriptor.summary}<strong>{descriptor.summary}</strong>{/if}
            {#if descriptor.summary && descriptor.description}&nbsp;&mdash;&nbsp;{/if}
            {descriptor.description ?? ''}
          </p>
        {/if}
        <SchemaViewer schema={descriptor.schema} compact testId="{testId}-{index}-schema" />
        {#if descriptor.extensions?.length}
          <div class="extensions" data-testid="{testId}-{index}-extensions">
            {#each descriptor.extensions as extension (extension.key)}
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
     density convention as SchemaCatalog. */
  .descriptors {
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
