<script lang="ts">
  import type { JsonRpcDocument as JsonRpcDocumentModel } from '@apibox/core';
  import Chip from '../../atoms/Chip.svelte';
  import DocumentHeader from '../../organisms/DocumentHeader.svelte';
  import SchemaCatalog from '../../organisms/SchemaCatalog.svelte';
  import ServerList from '../../organisms/ServerList.svelte';
  import { itemsByNavigation } from '../navigation-groups.js';
  import RpcMethodCard from './RpcMethodCard.svelte';

  interface Props {
    document: JsonRpcDocumentModel;
    testId?: string;
  }

  const { document, testId = 'jsonrpc-document' }: Props = $props();
  const groups = $derived(itemsByNavigation(document.nav, document.methods));
  const schemaNavigation = $derived(document.nav.find((node) => node.id === 'schemas'));
</script>

<article class="document" data-testid={testId}>
  <DocumentHeader {document} specVersion={document.specVersion} testId="{testId}-header" />
  {#if document.extensions?.length}
    <div class="extensions" data-testid="{testId}-extensions">
      {#each document.extensions as extension (extension.key)}
        <Chip
          label={extension.key}
          value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
          code
          testId="{testId}-extension-{extension.key}"
        />
      {/each}
    </div>
  {/if}
  <ServerList servers={document.servers} testId="{testId}-servers" />

  {#each groups as group (group.node.id)}
    {@const groupId = `${testId}-${group.node.id}`}
    <section id={group.node.id} class="group" data-testid={groupId}>
      <h2 data-testid="{groupId}-title">{group.node.label}</h2>
      {#each group.items as method (method.id)}
        <RpcMethodCard {method} testId="{testId}-method-{method.id}" />
      {/each}
    </section>
  {/each}

  <SchemaCatalog schemas={document.schemas} navigation={schemaNavigation} testId="{testId}-schemas" />
</article>

<style>
  .document {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
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

  .group {
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  h2 {
    margin: 0 0 var(--apibox-space-4);
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
