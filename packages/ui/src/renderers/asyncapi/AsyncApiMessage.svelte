<script lang="ts">
  import type { MessageInfo } from '@apibox/core';
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
</style>
