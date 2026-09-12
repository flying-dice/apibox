<script lang="ts">
  import type { RpcExample } from '@apibox/core';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import { formatJson } from '../../format-json.js';
  import CodeBlock from '../../molecules/CodeBlock.svelte';

  interface Props {
    example: RpcExample;
    methodName: string;
    testId: string;
  }

  const { example, methodName, testId }: Props = $props();
</script>

<div class="example" data-testid={testId}>
  <h5 data-testid="{testId}-title">{example.name}</h5>
  {#if example.summary || example.description}
    <p data-testid="{testId}-description">
      {#if example.summary}<strong>{example.summary}</strong>{/if}
      {#if example.summary && example.description}&nbsp;&mdash;&nbsp;{/if}
      {example.description ?? ''}
    </p>
  {/if}
  <CodeBlock
    code={formatJson(
      { jsonrpc: '2.0', method: methodName, params: example.params, id: 1 },
      'This value could not be serialized as JSON.',
    )}
    language="json"
    label="Request"
    testId="{testId}-request"
  />
  {#if example.resultExternalValue}
    <!--
      `externalValue` points at a URL rather than carrying the result inline. Rendered as
      a link, never fetched -- same treatment as ExampleViewer's `externalValue` (OpenAPI).
    -->
    <p class="external" data-testid="{testId}-response-external-value">
      <Link href={example.resultExternalValue} testId="{testId}-response-external-value-link">
        {example.resultExternalValue}
      </Link>
    </p>
  {:else}
    <CodeBlock
      code={formatJson(
        { jsonrpc: '2.0', result: example.result, id: 1 },
        'This value could not be serialized as JSON.',
      )}
      language="json"
      label="Response"
      testId="{testId}-response"
    />
  {/if}
  {#if example.extensions?.length}
    <div class="extensions" data-testid="{testId}-extensions">
      {#each example.extensions as extension (extension.key)}
        <Chip
          label={extension.key}
          value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
          code
          testId="{testId}-extension-{extension.key}"
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .example {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
    padding: var(--apibox-space-4);
    background: var(--apibox-bg-sunken);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  h5,
  p {
    margin: 0;
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
