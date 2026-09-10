<script lang="ts">
  import type { SecuritySchemeInfo } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Code from '../atoms/Code.svelte';
  import Link from '../atoms/Link.svelte';
  import KeyValueRow from '../molecules/KeyValueRow.svelte';

  interface Props {
    schemes: readonly SecuritySchemeInfo[];
    testId?: string;
  }

  const { schemes, testId = 'security' }: Props = $props();
</script>

{#if schemes.length > 0}
  <section class="section" aria-labelledby="{testId}-title" data-testid={testId}>
    <h2 id="{testId}-title">Authentication</h2>
    <div class="list">
      {#each schemes as scheme, index (index)}
        <article class="scheme" data-testid="{testId}-{index}">
          <div class="heading">
            <h3>{scheme.name}</h3>
            <Badge tone="info" variant="outline" testId="{testId}-{index}-type">
              {scheme.type}
            </Badge>
          </div>
          {#if scheme.description}<p class="description">{scheme.description}</p>{/if}
          <dl data-testid="{testId}-{index}-metadata">
            {#if scheme.paramName}
              <KeyValueRow label={scheme.in ?? 'Parameter'} testId="{testId}-{index}-parameter">
                <Code testId="{testId}-{index}-parameter-name">{scheme.paramName}</Code>
              </KeyValueRow>
            {/if}
            {#if scheme.httpScheme}
              <KeyValueRow label="Scheme" testId="{testId}-{index}-scheme">
                {scheme.httpScheme}
              </KeyValueRow>
            {/if}
            {#if scheme.bearerFormat}
              <KeyValueRow label="Bearer format" testId="{testId}-{index}-bearer-format">
                {scheme.bearerFormat}
              </KeyValueRow>
            {/if}
            {#if scheme.openIdConnectUrl}
              <KeyValueRow label="Discovery" testId="{testId}-{index}-discovery">
                <Link href={scheme.openIdConnectUrl} testId="{testId}-{index}-discovery-link">
                  OpenID configuration
                </Link>
              </KeyValueRow>
            {/if}
          </dl>
          {#if scheme.flows?.length}
            <div class="flows">
              {#each scheme.flows as flow, flowIndex (flowIndex)}
                <section class="flow" data-testid="{testId}-{index}-flow-{flowIndex}">
                  <h4>{flow.kind}</h4>
                  {#if flow.authorizationUrl}
                    <Link href={flow.authorizationUrl} testId="{testId}-{index}-flow-{flowIndex}-authorization-link">
                      Authorization URL
                    </Link>
                  {/if}
                  {#if flow.tokenUrl}
                    <Link href={flow.tokenUrl} testId="{testId}-{index}-flow-{flowIndex}-token-link">
                      Token URL
                    </Link>
                  {/if}
                  {#if flow.refreshUrl}
                    <Link href={flow.refreshUrl} testId="{testId}-{index}-flow-{flowIndex}-refresh-link">
                      Refresh URL
                    </Link>
                  {/if}
                  {#if flow.scopes.length > 0}
                    <dl data-testid="{testId}-{index}-flow-{flowIndex}-scopes">
                      {#each flow.scopes as scope, scopeIndex (scopeIndex)}
                        <KeyValueRow label={scope.name} testId="{testId}-{index}-scope-{scopeIndex}">
                          {scope.description ?? 'No description'}
                        </KeyValueRow>
                      {/each}
                    </dl>
                  {/if}
                </section>
              {/each}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  </section>
{/if}

<style>
  .section,
  .list,
  .scheme,
  .flows,
  .flow {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  h2,
  h3,
  h4,
  p,
  dl {
    margin: 0;
  }

  .scheme {
    padding: var(--apibox-space-4);
    background: var(--apibox-bg-raised);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .heading {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  .description {
    color: var(--apibox-fg-muted);
  }

  .flow {
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }
</style>
