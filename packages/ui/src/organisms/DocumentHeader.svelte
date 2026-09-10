<script lang="ts">
  import type { ApiDocumentBase } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Link from '../atoms/Link.svelte';
  import KeyValueRow from '../molecules/KeyValueRow.svelte';

  interface Props {
    document: ApiDocumentBase;
    specVersion?: string;
    testId?: string;
  }

  const { document, specVersion, testId = 'document-header' }: Props = $props();
</script>

<header class="header" data-testid={testId}>
  <div class="eyebrow">
    <Badge tone="info" variant="outline" testId="{testId}-kind">{document.kind}</Badge>
    {#if specVersion}<span data-testid="{testId}-spec-version">{specVersion}</span>{/if}
  </div>
  <h1 data-testid="{testId}-title">{document.title}</h1>
  {#if document.summary}<p class="summary" data-testid="{testId}-summary">{document.summary}</p>{/if}
  {#if document.description}
    <p class="description" data-testid="{testId}-description">{document.description}</p>
  {/if}

  <dl class="metadata" data-testid="{testId}-metadata">
    <KeyValueRow label="Version" testId="{testId}-version">{document.version}</KeyValueRow>
    {#if document.contact}
      <KeyValueRow label="Contact" testId="{testId}-contact">
        {#if document.contact.url}
          <Link href={document.contact.url} testId="{testId}-contact-link">
            {document.contact.name ?? document.contact.url}
          </Link>
        {:else if document.contact.email}
          <Link href="mailto:{document.contact.email}" testId="{testId}-contact-link">
            {document.contact.name ?? document.contact.email}
          </Link>
        {:else}
          {document.contact.name ?? 'Not specified'}
        {/if}
      </KeyValueRow>
    {/if}
    {#if document.license}
      <KeyValueRow label="License" testId="{testId}-license">
        {#if document.license.url}
          <Link href={document.license.url} testId="{testId}-license-link">
            {document.license.name}
          </Link>
        {:else}
          {document.license.name}
        {/if}
      </KeyValueRow>
    {/if}
    {#if document.externalDocs}
      <KeyValueRow label="External docs" testId="{testId}-external-docs">
        <Link href={document.externalDocs.url} testId="{testId}-external-docs-link">
          {document.externalDocs.description ?? 'Open documentation'}
        </Link>
      </KeyValueRow>
    {/if}
  </dl>

  {#if document.warnings.length > 0}
    <aside class="warnings" aria-label="Document warnings" data-testid="{testId}-warnings">
      <strong>Warnings</strong>
      <ul data-testid="{testId}-warnings-list">
        {#each document.warnings as warning, index (index)}
          <li data-testid="{testId}-warning-{index}">{warning}</li>
        {/each}
      </ul>
    </aside>
  {/if}
</header>

<style>
  .header {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
  }

  .eyebrow {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }

  h1 {
    margin: 0;
    font-size: var(--apibox-font-size-xl);
    line-height: 1.2;
  }

  .summary,
  .description {
    max-width: 74ch;
    margin: 0;
  }

  .summary {
    font-size: var(--apibox-font-size-lg);
  }

  .description {
    color: var(--apibox-fg-muted);
    white-space: pre-wrap;
  }

  .metadata {
    max-width: 44rem;
    margin: 0;
  }

  .warnings {
    padding: var(--apibox-space-4);
    color: var(--apibox-warning);
    background: color-mix(in srgb, var(--apibox-warning) 10%, transparent);
    border-left: 3px solid var(--apibox-warning);
  }

  .warnings ul {
    margin: var(--apibox-space-2) 0 0;
    padding-left: var(--apibox-space-5);
  }
</style>
