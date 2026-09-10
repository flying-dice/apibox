<script lang="ts">
  import type { NavNode, SchemaNode } from '@apibox/core';
  import SchemaViewer from './SchemaViewer.svelte';

  interface Props {
    schemas: readonly SchemaNode[];
    navigation?: NavNode;
    testId?: string;
  }

  const { schemas, navigation, testId = 'schema-catalog' }: Props = $props();
</script>

{#if schemas.length > 0}
  <section
    id={navigation?.id ?? 'schemas'}
    class="schemas"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title">Schemas</h2>
    {#each schemas as schema, index (index)}
      <article
        id={navigation?.children?.[index]?.id ?? `schema-${index}`}
        class="schema"
        data-testid="{testId}-{index}"
      >
        <h3>{schema.name ?? schema.title ?? `Schema ${index + 1}`}</h3>
        <SchemaViewer {schema} testId="{testId}-{index}-viewer" />
      </article>
    {/each}
  </section>
{/if}

<style>
  .schemas,
  .schema {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-5);
  }

  .schemas {
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  .schema {
    padding: var(--apibox-space-4);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  h2,
  h3 {
    margin: 0;
  }
</style>
