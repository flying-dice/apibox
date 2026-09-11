<script lang="ts">
  import type { OpenApiDocument as OpenApiDocumentModel } from '@apibox/core';
  import DocumentHeader from '../../organisms/DocumentHeader.svelte';
  import OperationCard from '../../organisms/OperationCard.svelte';
  import SchemaCatalog from '../../organisms/SchemaCatalog.svelte';
  import SecuritySchemes from '../../organisms/SecuritySchemes.svelte';
  import ServerList from '../../organisms/ServerList.svelte';
  import { itemsByNavigation } from '../navigation-groups.js';

  interface Props {
    document: OpenApiDocumentModel;
    testId?: string;
  }

  const { document, testId = 'openapi-document' }: Props = $props();
  const operationGroups = $derived(itemsByNavigation(document.nav, document.operations));
  const schemaNavigation = $derived(document.nav.find((node) => node.id === 'schemas'));
  const tagDescriptions = $derived(new Map(document.tags.map((tag) => [tag.name, tag.description])));
</script>

<article class="document" data-testid={testId}>
  <DocumentHeader {document} specVersion={document.specVersion} testId="{testId}-header" />
  <ServerList servers={document.servers} testId="{testId}-servers" />
  <SecuritySchemes schemes={document.securitySchemes} testId="{testId}-security" />

  <section class="operations" aria-labelledby="{testId}-operations-title" data-testid="{testId}-operations">
    <h2 id="{testId}-operations-title">Operations</h2>
    {#if operationGroups.length === 0}
      <p class="empty" data-testid="{testId}-operations-empty">No operations were declared.</p>
    {/if}
    {#each operationGroups as group (group.node.id)}
      <section id={group.node.id} class="group" data-testid="{testId}-{group.node.id}">
        <header data-testid="{testId}-{group.node.id}-header">
          <h2 data-testid="{testId}-{group.node.id}-title">{group.node.label}</h2>
          {#if tagDescriptions.get(group.node.label)}
            <p data-testid="{testId}-{group.node.id}-description">
              {tagDescriptions.get(group.node.label)}
            </p>
          {/if}
        </header>
        {#each group.items as operation (operation.id)}
          <OperationCard
            {operation}
            inheritedSecurity={document.security}
            testId="{testId}-operation-{operation.id}"
          />
        {/each}
      </section>
    {/each}
  </section>

  <SchemaCatalog schemas={document.schemas} navigation={schemaNavigation} testId="{testId}-schemas" />
</article>

<style>
  .document,
  .operations {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-5);
  }

  /* No gap between rows: the hairline in CollapsibleCard carries the separation. */
  .group {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .document {
    max-width: 76rem;
    margin: 0 auto;
  }

  .operations {
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  .group > header {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
    margin-bottom: var(--apibox-space-4);
  }

  h2,
  p {
    margin: 0;
  }

  .group > header p,
  .empty {
    color: var(--apibox-fg-muted);
  }
</style>
