<script lang="ts">
  import type { AsyncApiDocument as AsyncApiDocumentModel } from '@apibox/core';
  import Badge from '../../atoms/Badge.svelte';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import BindingList from '../../organisms/BindingList.svelte';
  import DocumentHeader from '../../organisms/DocumentHeader.svelte';
  import ParameterTable from '../../organisms/ParameterTable.svelte';
  import SchemaCatalog from '../../organisms/SchemaCatalog.svelte';
  import SecuritySchemes from '../../organisms/SecuritySchemes.svelte';
  import ServerList from '../../organisms/ServerList.svelte';
  import { itemsByNavigation } from '../navigation-groups.js';
  import AsyncApiOperationCard from './AsyncApiOperationCard.svelte';

  interface Props {
    document: AsyncApiDocumentModel;
    testId?: string;
  }

  const { document, testId = 'asyncapi-document' }: Props = $props();
  const operationGroups = $derived(itemsByNavigation(document.nav, document.operations));
  const schemaNavigation = $derived(document.nav.find((node) => node.id === 'schemas'));
</script>

<article class="document" data-testid={testId}>
  <DocumentHeader {document} specVersion={document.specVersion} testId="{testId}-header" />
  {#if document.applicationId}
    <p class="application-id" data-testid="{testId}-application-id">
      Application id: <code>{document.applicationId}</code>
    </p>
  {/if}
  {#if document.extensions?.length}
    <!-- Root/info-level `x-*` extensions, chipped the same way OpenApiDocument shows its own. -->
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
  <SecuritySchemes schemes={document.securitySchemes} testId="{testId}-security" />

  {#if document.tags.length > 0}
    <section class="tags" aria-labelledby="{testId}-tags-title" data-testid="{testId}-tags">
      <h2 id="{testId}-tags-title" data-testid="{testId}-tags-title">Tags</h2>
      <div class="tag-list">
        {#each document.tags as tag, index (tag.name)}
          <span class="tag" data-testid="{testId}-tag-{index}">
            <Badge tone="neutral" variant="outline" testId="{testId}-tag-{index}-name">{tag.name}</Badge>
            {#if tag.description}<span data-testid="{testId}-tag-{index}-description">{tag.description}</span>{/if}
            {#if tag.externalDocs}
              <Link href={tag.externalDocs.url} testId="{testId}-tag-{index}-external-docs">
                {tag.externalDocs.description ?? 'Docs'}
              </Link>
            {/if}
          </span>
        {/each}
      </div>
    </section>
  {/if}

  {#each operationGroups as group (group.node.id)}
    <section id={group.node.id} class="group" data-testid="{testId}-{group.node.id}">
      <h2 data-testid="{testId}-{group.node.id}-title">{group.node.label}</h2>
      {#each group.items as operation (operation.id)}
        <AsyncApiOperationCard {operation} testId="{testId}-operation-{operation.id}" />
      {/each}
    </section>
  {/each}

  {#if document.orphanChannels.length > 0}
    <section
      id="channels"
      class="group"
      aria-labelledby="{testId}-channels-title"
      data-testid="{testId}-channels"
    >
      <h2 id="{testId}-channels-title" data-testid="{testId}-channels-title">Channels</h2>
      <p class="channels-note">Declared, but no operation references them yet.</p>
      {#each document.orphanChannels as channel, index (channel.id)}
        <article class="channel" data-testid="{testId}-channel-{index}">
          <h3 data-testid="{testId}-channel-{index}-title">{channel.title ?? channel.address}</h3>
          <code data-testid="{testId}-channel-{index}-address">{channel.address}</code>
          {#if channel.description}
            <p data-testid="{testId}-channel-{index}-description">{channel.description}</p>
          {/if}
          {#if channel.servers?.length}
            <p class="servers" data-testid="{testId}-channel-{index}-servers">
              Available on: {channel.servers.join(', ')}
            </p>
          {/if}
          {#if channel.tags?.length}
            <div class="tags" data-testid="{testId}-channel-{index}-tags">
              {#each channel.tags as tag, tagIndex (tagIndex)}
                <Badge tone="neutral" variant="outline" small testId="{testId}-channel-{index}-tag-{tagIndex}">
                  {tag}
                </Badge>
              {/each}
            </div>
          {/if}
          {#if channel.externalDocs}
            <Link href={channel.externalDocs.url} testId="{testId}-channel-{index}-external-docs">
              {channel.externalDocs.description ?? 'Docs'}
            </Link>
          {/if}
          <ParameterTable parameters={channel.parameters} testId="{testId}-channel-{index}-parameters" />
          <BindingList bindings={channel.bindings} testId="{testId}-channel-{index}-bindings" label="Channel" />
          {#if channel.extensions?.length}
            <div class="extensions" data-testid="{testId}-channel-{index}-extensions">
              {#each channel.extensions as extension (extension.key)}
                <Chip
                  label={extension.key}
                  value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
                  code
                  testId="{testId}-channel-{index}-extension-{extension.key}"
                />
              {/each}
            </div>
          {/if}
        </article>
      {/each}
    </section>
  {/if}

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

  .group,
  .tags {
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  h2 {
    margin: 0 0 var(--apibox-space-4);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
  }

  .tag {
    display: flex;
    align-items: center;
    gap: var(--apibox-space-2);
    color: var(--apibox-fg-muted);
  }

  .channels-note {
    margin: 0 0 var(--apibox-space-4);
    color: var(--apibox-fg-muted);
  }

  .channel {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
    padding: var(--apibox-space-4) 0;
    border-top: 1px solid var(--apibox-border);
  }

  .channel:first-child {
    border-top: none;
    padding-top: 0;
  }

  .channel h3 {
    margin: 0;
  }

  .channel p {
    margin: 0;
    color: var(--apibox-fg-muted);
  }

  .channel code {
    font-family: var(--apibox-font-code);
    color: var(--apibox-fg-muted);
  }

  .application-id {
    margin: 0;
    color: var(--apibox-fg-muted);
  }

  .application-id code {
    font-family: var(--apibox-font-code);
  }

  .extensions,
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
