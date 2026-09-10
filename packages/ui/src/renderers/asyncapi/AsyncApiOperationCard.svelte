<script lang="ts">
  import type { ChannelOperation } from '@apibox/core';
  import Badge from '../../atoms/Badge.svelte';
  import ParameterTable from '../../organisms/ParameterTable.svelte';
  import AsyncApiMessage from './AsyncApiMessage.svelte';

  interface Props {
    operation: ChannelOperation;
    testId: string;
  }

  const { operation, testId }: Props = $props();
</script>

<article id={operation.id} class="card" data-testid={testId}>
  <header data-testid="{testId}-header">
    <Badge
      tone={operation.action === 'send' ? 'success' : 'info'}
      testId="{testId}-action"
    >
      {operation.action}
    </Badge>
    <h3 data-testid="{testId}-summary">
      {operation.summary ?? operation.channelTitle ?? operation.channelAddress}
    </h3>
  </header>
  <code data-testid="{testId}-address">{operation.channelAddress}</code>
  {#if operation.description}
    <p data-testid="{testId}-description">{operation.description}</p>
  {/if}
  <ParameterTable parameters={operation.parameters} testId="{testId}-parameters" />
  {#each operation.messages as message, index (`${message.name}-${index}`)}
    <AsyncApiMessage {message} testId="{testId}-message-{index}" />
  {/each}
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
    padding: var(--apibox-space-4);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  header {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  h3,
  p {
    margin: 0;
  }

  code {
    font-family: var(--apibox-font-code);
    color: var(--apibox-fg-muted);
  }
</style>
