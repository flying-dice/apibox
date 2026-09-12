<script lang="ts">
  import type { OpenApiDocument as OpenApiDocumentModel } from '@apibox/core';
  import DocumentHeader from '../../organisms/DocumentHeader.svelte';
  import OperationCard from '../../organisms/OperationCard.svelte';
  import SchemaCatalog from '../../organisms/SchemaCatalog.svelte';
  import SecuritySchemes from '../../organisms/SecuritySchemes.svelte';
  import ServerList from '../../organisms/ServerList.svelte';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import KeyValueRow from '../../molecules/KeyValueRow.svelte';
  import { itemsByNavigation } from '../navigation-groups.js';

  interface Props {
    document: OpenApiDocumentModel;
    testId?: string;
  }

  const { document, testId = 'openapi-document' }: Props = $props();
  const operationGroups = $derived(itemsByNavigation(document.nav, document.operations));
  const schemaNavigation = $derived(document.nav.find((node) => node.id === 'schemas'));
  const tagDescriptions = $derived(new Map(document.tags.map((tag) => [tag.name, tag.description])));
  const tagExtensions = $derived(new Map(document.tags.map((tag) => [tag.name, tag.extensions])));
</script>

<article class="document" data-testid={testId}>
  <DocumentHeader {document} specVersion={document.specVersion} testId="{testId}-header" />

  {#if document.jsonSchemaDialect || document.selfUrl}
    <!--
      Same idea as JsonSchemaDocument's dialect/schemaId row -- kept visually identical so
      the two don't read as different features of the same underlying concept.
    -->
    <dl class="metadata" data-testid="{testId}-metadata">
      {#if document.jsonSchemaDialect}
        <KeyValueRow label="Schema dialect" testId="{testId}-dialect">
          {document.jsonSchemaDialect}
        </KeyValueRow>
      {/if}
      {#if document.selfUrl}
        <KeyValueRow label="Document URL" testId="{testId}-self-url">
          <Link href={document.selfUrl} testId="{testId}-self-url-link">{document.selfUrl}</Link>
        </KeyValueRow>
      {/if}
    </dl>
  {/if}

  {#if document.extensions?.length}
    <!-- Root/Info-level `x-*` extensions, chipped the same way SchemaNodeRow shows a schema's own. -->
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
          {#if tagExtensions.get(group.node.label)?.length}
            <div class="extensions" data-testid="{testId}-{group.node.id}-extensions">
              {#each tagExtensions.get(group.node.label) ?? [] as extension (extension.key)}
                <Chip
                  label={extension.key}
                  value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
                  code
                  testId="{testId}-{group.node.id}-extension-{extension.key}"
                />
              {/each}
            </div>
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

  {#if document.webhooks?.length}
    <!--
      Same collapsed-row treatment as Operations (card 29/30's density constraint), just not
      sub-grouped by tag -- a webhook-first document is small enough that one flat list reads
      better than another layer of grouping. `OperationCard` is reused as-is: a webhook is
      structurally an Operation, just keyed by name rather than a URL (see webhooks' parser
      comment for why `path` holds the name).
    -->
    <section class="webhooks" aria-labelledby="{testId}-webhooks-title" data-testid="{testId}-webhooks">
      <h2 id="{testId}-webhooks-title">Webhooks</h2>
      {#each document.webhooks as webhook (webhook.id)}
        <OperationCard
          operation={webhook}
          inheritedSecurity={document.security}
          testId="{testId}-webhook-{webhook.id}"
        />
      {/each}
    </section>
  {/if}

  <SchemaCatalog schemas={document.schemas} navigation={schemaNavigation} testId="{testId}-schemas" />
</article>

<style>
  .document,
  .operations,
  .webhooks {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-5);
  }

  .metadata {
    max-width: 44rem;
    margin: 0;
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }

  .webhooks {
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
    gap: 0;
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
