<script lang="ts">
  import type { Operation, SecurityRequirement } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Code from '../atoms/Code.svelte';
  import HttpMethod from '../atoms/HttpMethod.svelte';
  import Link from '../atoms/Link.svelte';
  import ParameterTable from './ParameterTable.svelte';
  import RequestBody from './RequestBody.svelte';
  import ResponseList from './ResponseList.svelte';

  interface Props {
    operation: Operation;
    inheritedSecurity?: readonly SecurityRequirement[];
    testId?: string;
  }

  const { operation, inheritedSecurity = [], testId = `operation-${operation.id}` }: Props = $props();
  const security = $derived(operation.security ?? inheritedSecurity);
</script>

<article id={operation.id} class="operation" data-testid={testId}>
  <header class="header" data-testid="{testId}-header">
    <div class="route">
      <HttpMethod
        method={operation.method}
        deprecated={operation.deprecated}
        variant="solid"
        testId="{testId}-method"
      />
      <Code testId="{testId}-path">{operation.path}</Code>
      {#if operation.deprecated}
        <Badge tone="warning" variant="outline" testId="{testId}-deprecated">
          deprecated
        </Badge>
      {/if}
    </div>
    <h3 data-testid="{testId}-summary">{operation.summary ?? operation.operationId ?? operation.id}</h3>
    {#if operation.description}<p class="description">{operation.description}</p>{/if}
    {#if operation.externalDocs}
      <Link href={operation.externalDocs.url} testId="{testId}-external-docs">
        External documentation
      </Link>
    {/if}
  </header>

  {#if security.length > 0}
    <div class="security" data-testid="{testId}-security">
      <strong>Authentication</strong>
      {#each security as requirement}
        <span>
          {requirement.alternatives.map((item) => item.scheme).join(' or ')}
        </span>
      {/each}
    </div>
  {:else if operation.security}
    <p class="public" data-testid="{testId}-public">No authentication required.</p>
  {/if}

  <ParameterTable parameters={operation.parameters} testId="{testId}-parameters" />
  {#if operation.requestBody}<RequestBody body={operation.requestBody} testId="{testId}-request" />{/if}
  <ResponseList responses={operation.responses} testId="{testId}-responses" />
</article>

<style>
  .operation,
  .header {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
  }

  .operation {
    padding: var(--apibox-space-5);
    background: var(--apibox-bg-raised);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .route,
  .security {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  h3,
  p {
    margin: 0;
  }

  .description,
  .public {
    color: var(--apibox-fg-muted);
  }

  .security {
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }
</style>
