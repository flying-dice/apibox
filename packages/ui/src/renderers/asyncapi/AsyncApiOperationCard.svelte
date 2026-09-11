<script lang="ts">
  import type { ChannelOperation } from '@apibox/core';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';
  import Badge from '../../atoms/Badge.svelte';
  import ParameterTable from '../../organisms/ParameterTable.svelte';
  import AsyncApiMessage from './AsyncApiMessage.svelte';

  interface Props {
    operation: ChannelOperation;
    testId: string;
  }

  const { operation, testId }: Props = $props();
</script>

<CollapsibleCard id={operation.id} {testId}>
  {#snippet summary()}
    <Badge
      tone={operation.action === 'send' ? 'success' : 'info'}
      testId="{testId}-action"
    >
      {operation.action}
    </Badge>
    <span data-testid="{testId}-summary">
      {operation.summary ?? operation.channelTitle ?? operation.channelAddress}
    </span>
  {/snippet}

  <code data-testid="{testId}-address">{operation.channelAddress}</code>
  {#if operation.description}
    <p data-testid="{testId}-description">{operation.description}</p>
  {/if}
  <ParameterTable parameters={operation.parameters} testId="{testId}-parameters" />
  {#each operation.messages as message, index (`${message.name}-${index}`)}
    <AsyncApiMessage {message} testId="{testId}-message-{index}" />
  {/each}
</CollapsibleCard>

<style>
  p {
    margin: 0;
  }

  code {
    font-family: var(--apibox-font-code);
    color: var(--apibox-fg-muted);
  }
</style>
