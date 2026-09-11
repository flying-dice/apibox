<script lang="ts">
  import type { ChannelOperation } from '@apibox/core';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';
  import Badge from '../../atoms/Badge.svelte';
  import BindingList from '../../organisms/BindingList.svelte';
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
    {#each operation.tags ?? [] as tag, index (tag)}
      <Badge tone="neutral" variant="outline" small testId="{testId}-tag-{index}">{tag}</Badge>
    {/each}
  {/snippet}

  <code data-testid="{testId}-address">{operation.channelAddress}</code>
  {#if operation.description}
    <p data-testid="{testId}-description">{operation.description}</p>
  {/if}
  {#if operation.channelServers?.length}
    <p class="servers" data-testid="{testId}-channel-servers">
      Available on: {operation.channelServers.join(', ')}
    </p>
  {/if}

  {#if operation.security?.length}
    <div class="security" data-testid="{testId}-security">
      <strong>Authentication</strong>
      {#each operation.security as requirement, index (index)}
        <span data-testid="{testId}-security-{index}">
          {requirement.alternatives.map((item) => item.scheme).join(' or ')}
        </span>
      {/each}
    </div>
  {/if}

  <ParameterTable parameters={operation.parameters} testId="{testId}-parameters" />
  <BindingList bindings={operation.channelBindings} testId="{testId}-channel-bindings" />
  <BindingList bindings={operation.bindings} testId="{testId}-bindings" />
  {#each operation.messages as message, index (`${message.name}-${index}`)}
    <AsyncApiMessage {message} testId="{testId}-message-{index}" />
  {/each}

  {#if operation.reply}
    <section class="reply" aria-labelledby="{testId}-reply-title" data-testid="{testId}-reply">
      <h4 id="{testId}-reply-title" data-testid="{testId}-reply-title">Reply</h4>
      {#if operation.reply.channelAddress}
        <code data-testid="{testId}-reply-address">{operation.reply.channelAddress}</code>
      {/if}
      {#if operation.reply.addressLocation}
        <p data-testid="{testId}-reply-location">
          Correlates via <code>{operation.reply.addressLocation}</code>
          {#if operation.reply.addressDescription}&mdash; {operation.reply.addressDescription}{/if}
        </p>
      {/if}
      {#each operation.reply.messages as message, index (`${message.name}-${index}`)}
        <AsyncApiMessage {message} testId="{testId}-reply-message-{index}" />
      {/each}
    </section>
  {/if}
</CollapsibleCard>

<style>
  p {
    margin: 0;
  }

  code {
    font-family: var(--apibox-font-code);
    color: var(--apibox-fg-muted);
  }

  .servers {
    color: var(--apibox-fg-muted);
  }

  .security {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }

  .reply {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
    padding: var(--apibox-space-4);
    background: var(--apibox-bg-sunken);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .reply h4 {
    margin: 0;
  }
</style>
