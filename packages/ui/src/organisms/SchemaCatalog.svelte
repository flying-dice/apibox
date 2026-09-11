<script lang="ts">
  import type { NavNode, SchemaNode } from '@apibox/core';
  import CollapsibleCard from '../molecules/CollapsibleCard.svelte';
  import SchemaViewer from './SchemaViewer.svelte';

  interface Props {
    schemas: readonly SchemaNode[];
    navigation?: NavNode;
    /** Section heading — overridable where "Schemas" is the wrong noun, e.g. JSON Schema's own $defs/definitions. */
    title?: string;
    testId?: string;
  }

  const { schemas, navigation, title = 'Schemas', testId = 'schema-catalog' }: Props = $props();
</script>

{#if schemas.length > 0}
  <section
    id={navigation?.id ?? 'schemas'}
    class="schemas"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title" data-testid="{testId}-title">{title}</h2>
    {#each schemas as schema, index (index)}
      <CollapsibleCard
        id={navigation?.children?.[index]?.id ?? `schema-${index}`}
        testId="{testId}-{index}"
      >
        {#snippet summary()}
          <span>{schema.name ?? schema.title ?? `Schema ${index + 1}`}</span>
        {/snippet}
        <SchemaViewer {schema} testId="{testId}-{index}-viewer" />
      </CollapsibleCard>
    {/each}
  </section>
{/if}

<style>
  /* No gap between rows: the hairline in CollapsibleCard carries the separation. */
  .schemas {
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
