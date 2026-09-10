<script lang="ts">
  import type { RpcExample } from '@apibox/core';
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
  {#if example.description}
    <p data-testid="{testId}-description">{example.description}</p>
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
  <CodeBlock
    code={formatJson(
      { jsonrpc: '2.0', result: example.result, id: 1 },
      'This value could not be serialized as JSON.',
    )}
    language="json"
    label="Response"
    testId="{testId}-response"
  />
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
</style>
