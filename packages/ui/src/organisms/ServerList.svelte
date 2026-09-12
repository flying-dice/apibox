<script lang="ts">
  import type { ServerInfo } from '@apibox/core';
  import Code from '../atoms/Code.svelte';
  import KeyValueRow from '../molecules/KeyValueRow.svelte';
  import BindingList from './BindingList.svelte';

  interface Props {
    servers: readonly ServerInfo[];
    testId?: string;
  }

  const { servers, testId = 'servers' }: Props = $props();
</script>

{#if servers.length > 0}
  <section class="section" aria-labelledby="{testId}-title" data-testid={testId}>
    <h2 id="{testId}-title">Servers</h2>
    <div class="list">
      {#each servers as server, index (index)}
        <article class="server" data-testid="{testId}-{index}">
          <Code testId="{testId}-{index}-url">{server.url}</Code>
          {#if server.description}<p>{server.description}</p>{/if}
          {#if server.protocol}<p>Protocol: {server.protocol}</p>{/if}
          {#if server.variables?.length}
            <dl data-testid="{testId}-{index}-variables">
              {#each server.variables as variable, variableIndex (variableIndex)}
                <KeyValueRow label={variable.name} testId="{testId}-{index}-variable-{variableIndex}">
                  {variable.default ?? 'No default'}
                  {#if variable.enum?.length} · {variable.enum.join(', ')}{/if}
                </KeyValueRow>
              {/each}
            </dl>
          {/if}
          {#if server.security?.length}
            <p class="security" data-testid="{testId}-{index}-security">
              Authentication:
              {#each server.security as requirement, requirementIndex (requirementIndex)}
                <span data-testid="{testId}-{index}-security-{requirementIndex}">
                  {requirement.alternatives.map((item) => item.scheme).join(' or ')}
                </span>
              {/each}
            </p>
          {/if}
          <BindingList bindings={server.bindings} testId="{testId}-{index}-bindings" label="Server" />
        </article>
      {/each}
    </div>
  </section>
{/if}

<style>
  .section,
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  h2,
  p,
  dl {
    margin: 0;
  }

  .server {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
    padding: var(--apibox-space-4);
    background: var(--apibox-bg-raised);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .server p {
    color: var(--apibox-fg-muted);
  }

  .security {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
