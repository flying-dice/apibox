<script lang="ts">
  import type { MessageInfo } from '@apibox/core';
  import Badge from '../../atoms/Badge.svelte';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import BindingList from '../../organisms/BindingList.svelte';
  import ExampleViewer from '../../organisms/ExampleViewer.svelte';
  import SchemaViewer from '../../organisms/SchemaViewer.svelte';

  interface Props {
    message: MessageInfo;
    testId: string;
  }

  const { message, testId }: Props = $props();
</script>

<section class="message" data-testid={testId}>
  <h4 data-testid="{testId}-title">{message.title ?? message.name}</h4>
  {#if message.summary}<p data-testid="{testId}-summary">{message.summary}</p>{/if}
  {#if message.contentType}
    <code data-testid="{testId}-content-type">{message.contentType}</code>
  {/if}
  {#if message.tags?.length}
    <div class="tags" data-testid="{testId}-tags">
      {#each message.tags as tag, index (tag)}
        <Badge tone="neutral" variant="outline" small testId="{testId}-tag-{index}">{tag}</Badge>
      {/each}
    </div>
  {/if}
  {#if message.externalDocs}
    <Link href={message.externalDocs.url} testId="{testId}-external-docs">
      {message.externalDocs.description ?? 'Docs'}
    </Link>
  {/if}
  {#if message.correlationId}
    <p class="correlation" data-testid="{testId}-correlation-id">
      Correlation id: <code>{message.correlationId.location ?? 'unspecified'}</code>
      {#if message.correlationId.description}&mdash; {message.correlationId.description}{/if}
    </p>
  {/if}
  {#if message.payload}
    <h5 data-testid="{testId}-payload-title">Payload</h5>
    <SchemaViewer schema={message.payload} testId="{testId}-payload" />
  {:else if message.payloadSchemaFormat}
    <p class="non-schema" data-testid="{testId}-payload-format">
      Payload is {message.payloadSchemaFormat}, not JSON Schema &mdash; not rendered.
    </p>
  {/if}
  {#if message.headers}
    <h5 data-testid="{testId}-headers-title">Headers</h5>
    <SchemaViewer schema={message.headers} compact testId="{testId}-headers" />
  {:else if message.headersSchemaFormat}
    <p class="non-schema" data-testid="{testId}-headers-format">
      Headers are {message.headersSchemaFormat}, not JSON Schema &mdash; not rendered.
    </p>
  {/if}
  {#if message.examples?.length}
    <ExampleViewer examples={message.examples} testId="{testId}-examples" />
  {/if}
  <BindingList bindings={message.bindings} testId="{testId}-bindings" label="Message" />
  {#if message.extensions?.length}
    <div class="extensions" data-testid="{testId}-extensions">
      {#each message.extensions as extension (extension.key)}
        <Chip
          label={extension.key}
          value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
          code
          testId="{testId}-extension-{extension.key}"
        />
      {/each}
    </div>
  {/if}
</section>

<style>
  .message {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
    padding: var(--apibox-space-4);
    background: var(--apibox-bg-sunken);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  h4,
  h5,
  p {
    margin: 0;
  }

  code {
    font-family: var(--apibox-font-code);
    color: var(--apibox-fg-muted);
  }

  .correlation,
  .non-schema {
    color: var(--apibox-fg-muted);
  }

  .tags,
  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
