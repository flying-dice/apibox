<script lang="ts">
  import type { RpcMethod } from '@apibox/core';
  import Badge from '../../atoms/Badge.svelte';
  import SchemaViewer from '../../organisms/SchemaViewer.svelte';
  import RpcExamplePair from './RpcExamplePair.svelte';

  interface Props {
    method: RpcMethod;
    testId: string;
  }

  const { method, testId }: Props = $props();
</script>

<article id={method.id} class="card" data-testid={testId}>
  <header data-testid="{testId}-header">
    <Badge tone="info" deprecated={method.deprecated} testId="{testId}-kind">RPC</Badge>
    <h3 data-testid="{testId}-name">{method.name}</h3>
    <Badge variant="outline" testId="{testId}-param-structure">
      {method.paramStructure}
    </Badge>
  </header>
  {#if method.summary}
    <p data-testid="{testId}-summary"><strong>{method.summary}</strong></p>
  {/if}
  {#if method.description}<p data-testid="{testId}-description">{method.description}</p>{/if}

  {#if method.params.length > 0}
    <section data-testid="{testId}-params">
      <h4 data-testid="{testId}-params-title">Parameters</h4>
      {#each method.params as parameter, index (index)}
        <div class="schema" data-testid="{testId}-param-{parameter.name}-{index}">
          <h5 data-testid="{testId}-param-{parameter.name}-{index}-title">
            {parameter.name}{parameter.required ? ' · required' : ''}
          </h5>
          {#if parameter.description}
            <p data-testid="{testId}-param-{parameter.name}-{index}-description">
              {parameter.description}
            </p>
          {/if}
          <SchemaViewer
            schema={parameter.schema}
            compact
            testId="{testId}-param-{parameter.name}-{index}-schema"
          />
        </div>
      {/each}
    </section>
  {/if}

  {#if method.result}
    <section data-testid="{testId}-result-section">
      <h4 data-testid="{testId}-result-title">Result · {method.result.name}</h4>
      {#if method.result.description}
        <p data-testid="{testId}-result-description">{method.result.description}</p>
      {/if}
      <SchemaViewer schema={method.result.schema} testId="{testId}-result" />
    </section>
  {/if}

  {#if method.errors.length > 0}
    <section data-testid="{testId}-errors">
      <h4 data-testid="{testId}-errors-title">Errors</h4>
      {#each method.errors as error, index (index)}
        <div class="schema" data-testid="{testId}-error-{error.code}-{index}">
          <h5 data-testid="{testId}-error-{error.code}-{index}-title">
            {error.code} · {error.message}
          </h5>
          {#if error.description}
            <p data-testid="{testId}-error-{error.code}-{index}-description">
              {error.description}
            </p>
          {/if}
          {#if error.schema}
            <SchemaViewer
              schema={error.schema}
              compact
              testId="{testId}-error-{error.code}-{index}-schema"
            />
          {/if}
        </div>
      {/each}
    </section>
  {/if}

  {#if method.examples.length > 0}
    <section data-testid="{testId}-examples">
      <h4 data-testid="{testId}-examples-title">Examples</h4>
      {#each method.examples as example, index (`${example.name}-${index}`)}
        <RpcExamplePair
          {example}
          methodName={method.name}
          testId="{testId}-example-{index}"
        />
      {/each}
    </section>
  {/if}
</article>

<style>
  .card,
  .card > section,
  .schema {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
  }

  .card,
  .schema {
    padding: var(--apibox-space-4);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .schema {
    background: var(--apibox-bg-sunken);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  h3,
  h4,
  h5,
  p {
    margin: 0;
  }
</style>
