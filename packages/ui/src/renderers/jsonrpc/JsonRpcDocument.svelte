<script lang="ts">
  import type { JsonRpcDocument as JsonRpcDocumentModel } from '@apibox/core';
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
  .document,
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
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
    margin: 0;
  }
</style>
