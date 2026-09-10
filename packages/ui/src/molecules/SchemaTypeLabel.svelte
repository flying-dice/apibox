<script lang="ts">
  import { schemaTypeLabel } from '@apibox/core/schema';
  import type { SchemaNode } from '@apibox/core';
  import Code from '../atoms/Code.svelte';
  import Icon from '../atoms/Icon.svelte';

  /**
   * The one-line type of a schema, as it appears in a table cell or a property row.
   *
   * An unresolved reference is called out rather than shown as an empty type: the reader
   * needs to know the difference between "this accepts anything" and "the document pointed
   * somewhere we could not follow".
   */
  interface Props {
    schema?: SchemaNode;
    testId?: string;
  }

  const { schema, testId = 'schema-type' }: Props = $props();

  const label = $derived(schemaTypeLabel(schema));
  const unresolved = $derived(Boolean(schema?.unresolvedRef));
  const circular = $derived(Boolean(schema?.circularRef));
</script>

<span class="type" data-testid={testId}>
  <Code muted={!unresolved}>{label}</Code>

  {#if schema?.nullable && !label.includes('null')}
    <Code muted>| null</Code>
  {/if}

  {#if unresolved}
    <span class="warn" title="Could not resolve {schema?.unresolvedRef}" data-testid="{testId}-unresolved">
      <Icon name="warning" size={12} testId="{testId}-unresolved-icon" />
      unresolved
    </span>
  {:else if circular}
    <span class="circular" title="Recursive reference to {schema?.circularRef}" data-testid="{testId}-circular">
      recursive
    </span>
  {/if}
</span>

<style>
  .type {
    display: inline-flex;
    gap: var(--apibox-space-2);
    align-items: baseline;
  }

  .warn {
    display: inline-flex;
    gap: var(--apibox-space-1);
    align-items: center;
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-warning);
  }

  .circular {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }
</style>
