<script lang="ts">
  import type { Operation, SecurityRequirement } from '@apibox/core';
  import CollapsibleCard from '../molecules/CollapsibleCard.svelte';
  import Badge from '../atoms/Badge.svelte';
  import Chip from '../atoms/Chip.svelte';
  import Code from '../atoms/Code.svelte';
  import HttpMethod from '../atoms/HttpMethod.svelte';
  import Link from '../atoms/Link.svelte';
  import ParameterTable from './ParameterTable.svelte';
  import RequestBody from './RequestBody.svelte';
  import ResponseList from './ResponseList.svelte';
  // Self-import: a callback's Path Item is rendered with the same card as a top-level
  // operation. Naturally bounded -- see Operation.callbacks -- since a callback operation's
  // own `callbacks` is never populated, so this never recurses more than one level deep.
  import OperationCard from './OperationCard.svelte';

  interface Props {
    operation: Operation;
    inheritedSecurity?: readonly SecurityRequirement[];
    testId?: string;
  }

  const { operation, inheritedSecurity = [], testId = `operation-${operation.id}` }: Props = $props();
  const security = $derived(operation.security ?? inheritedSecurity);
</script>

<CollapsibleCard id={operation.id} {testId}>
  {#snippet summary()}
    <HttpMethod
      method={operation.method}
      deprecated={operation.deprecated}
      variant="soft"
      testId="{testId}-method"
    />
    <Code testId="{testId}-path">{operation.path}</Code>
    {#if operation.deprecated}
      <Badge tone="warning" variant="outline" testId="{testId}-deprecated">
        deprecated
      </Badge>
    {/if}
    <span data-testid="{testId}-summary">{operation.summary ?? operation.operationId ?? operation.id}</span>
  {/snippet}

  {#if operation.description}<p class="description">{operation.description}</p>{/if}
  {#if operation.externalDocs}
    <Link href={operation.externalDocs.url} testId="{testId}-external-docs">
      External documentation
    </Link>
  {/if}

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

  {#if operation.extensions?.length}
    <div class="extensions" data-testid="{testId}-extensions">
      {#each operation.extensions as extension (extension.key)}
        <Chip
          label={extension.key}
          value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
          code
          testId="{testId}-extension-{extension.key}"
        />
      {/each}
    </div>
  {/if}

  {#if operation.callbacks?.length}
    <section class="callbacks" aria-labelledby="{testId}-callbacks-title" data-testid="{testId}-callbacks">
      <h4 id="{testId}-callbacks-title">Callbacks</h4>
      {#each operation.callbacks as callback, callbackIndex (`${callback.name}-${callbackIndex}`)}
        <div class="callback" data-testid="{testId}-callback-{callbackIndex}">
          <p class="callback-heading" data-testid="{testId}-callback-{callbackIndex}-heading">
            <strong>{callback.name}</strong>
            <code>{callback.expression}</code>
          </p>
          {#each callback.operations as callbackOperation (callbackOperation.id)}
            <OperationCard
              operation={callbackOperation}
              testId="{testId}-callback-{callbackIndex}-{callbackOperation.id}"
            />
          {/each}
        </div>
      {/each}
    </section>
  {/if}
</CollapsibleCard>

<style>
  .security {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }

  p {
    margin: 0;
  }

  .description,
  .public {
    color: var(--apibox-fg-muted);
  }

  .callbacks,
  .callback {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }

  .callback-heading {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    align-items: baseline;
  }

  .callback-heading code {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
    color: var(--apibox-fg-muted);
  }
</style>
