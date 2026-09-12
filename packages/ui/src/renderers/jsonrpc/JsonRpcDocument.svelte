<script lang="ts">
  import type { JsonRpcDocument as JsonRpcDocumentModel } from '@apibox/core';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import DocumentHeader from '../../organisms/DocumentHeader.svelte';
  import SchemaCatalog from '../../organisms/SchemaCatalog.svelte';
  import ServerList from '../../organisms/ServerList.svelte';
  import { itemsByNavigation } from '../navigation-groups.js';
  import RpcContentDescriptorCatalog from './RpcContentDescriptorCatalog.svelte';
  import RpcMethodCard from './RpcMethodCard.svelte';

  interface Props {
    document: JsonRpcDocumentModel;
    testId?: string;
  }

  const { document, testId = 'jsonrpc-document' }: Props = $props();
  const groups = $derived(itemsByNavigation(document.nav, document.methods));
  const schemaNavigation = $derived(document.nav.find((node) => node.id === 'schemas'));
  const contentDescriptorNavigation = $derived(
    document.nav.find((node) => node.id === 'content-descriptors'),
  );
  // Tag Object metadata is keyed by name on `document.tags`, not carried on `NavNode`
  // (shared navigation infrastructure other formats also use) -- same lookup-by-label
  // treatment as OpenApiDocument's tag descriptions.
  const tagDescriptions = $derived(new Map(document.tags.map((tag) => [tag.name, tag.description])));
  const tagExternalDocs = $derived(new Map(document.tags.map((tag) => [tag.name, tag.externalDocs])));
  const tagExtensions = $derived(new Map(document.tags.map((tag) => [tag.name, tag.extensions])));
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
    {@const docs = tagExternalDocs.get(group.node.label)}
    {@const extensions = tagExtensions.get(group.node.label)}
    <section id={group.node.id} class="group" data-testid={groupId}>
      <header data-testid="{groupId}-header">
        <h2 data-testid="{groupId}-title">{group.node.label}</h2>
        {#if tagDescriptions.get(group.node.label)}
          <p data-testid="{groupId}-description">
            {tagDescriptions.get(group.node.label)}
          </p>
        {/if}
        {#if docs}
          <p data-testid="{groupId}-external-docs">
            <Link href={docs.url} testId="{groupId}-external-docs-link">
              {docs.description ?? 'Open documentation'}
            </Link>
          </p>
        {/if}
        {#if extensions?.length}
          <div class="extensions" data-testid="{groupId}-extensions">
            {#each extensions as extension (extension.key)}
              <Chip
                label={extension.key}
                value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
                code
                testId="{groupId}-extension-{extension.key}"
              />
            {/each}
          </div>
        {/if}
      </header>
      {#each group.items as method (method.id)}
        <RpcMethodCard {method} testId="{testId}-method-{method.id}" />
      {/each}
    </section>
  {/each}

  <SchemaCatalog schemas={document.schemas} navigation={schemaNavigation} testId="{testId}-schemas" />
  <RpcContentDescriptorCatalog
    contentDescriptors={document.contentDescriptors}
    navigation={contentDescriptorNavigation}
    testId="{testId}-content-descriptors"
  />
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

  .group > header {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
    margin-bottom: var(--apibox-space-4);
  }

  .group > header h2 {
    margin: 0;
  }

  .group > header p {
    margin: 0;
    color: var(--apibox-fg-muted);
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
