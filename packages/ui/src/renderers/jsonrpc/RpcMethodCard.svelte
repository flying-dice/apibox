<script lang="ts">
  import type { RpcMethod } from '@apibox/core';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';
  import Badge from '../../atoms/Badge.svelte';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import SchemaViewer from '../../organisms/SchemaViewer.svelte';
  import ServerList from '../../organisms/ServerList.svelte';
  import RpcExamplePair from './RpcExamplePair.svelte';

  interface Props {
    method: RpcMethod;
    testId: string;
  }

  const { method, testId }: Props = $props();
</script>

<CollapsibleCard id={method.id} {testId}>
  {#snippet summary()}
    <Badge tone="info" deprecated={method.deprecated} testId="{testId}-kind">RPC</Badge>
    <span data-testid="{testId}-name">{method.name}</span>
    <Badge variant="outline" testId="{testId}-param-structure">
      {method.paramStructure}
    </Badge>
  {/snippet}

  {#if method.summary}
    <p data-testid="{testId}-summary"><strong>{method.summary}</strong></p>
  {/if}
  {#if method.description}<p data-testid="{testId}-description">{method.description}</p>{/if}
  {#if method.externalDocs}
    <p data-testid="{testId}-external-docs">
      <Link href={method.externalDocs.url} testId="{testId}-external-docs-link">
        {method.externalDocs.description ?? 'Open documentation'}
      </Link>
    </p>
  {/if}
  {#if method.extensions?.length}
    <div class="extensions" data-testid="{testId}-extensions">
      {#each method.extensions as extension (extension.key)}
        <Chip
          label={extension.key}
          value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
          code
          testId="{testId}-extension-{extension.key}"
        />
      {/each}
    </div>
  {/if}

  {#if method.params.length > 0}
    <section data-testid="{testId}-params">
      <h4 data-testid="{testId}-params-title">Parameters</h4>
      {#each method.params as parameter, index (index)}
        <div class="schema" data-testid="{testId}-param-{parameter.name}-{index}">
          <h5 data-testid="{testId}-param-{parameter.name}-{index}-title">
            {parameter.name}{parameter.required ? ' · required' : ''}
            {#if parameter.deprecated}
              <Badge
                tone="warning"
                variant="outline"
                small
                testId="{testId}-param-{parameter.name}-{index}-deprecated"
              >deprecated</Badge>
            {/if}
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
      <h4 data-testid="{testId}-result-title">
        Result · {method.result.name}
        {#if method.result.deprecated}
          <Badge tone="warning" variant="outline" small testId="{testId}-result-deprecated">
            deprecated
          </Badge>
        {/if}
      </h4>
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

  {#if method.links.length > 0}
    <section data-testid="{testId}-links">
      <h4 data-testid="{testId}-links-title">Links</h4>
      {#each method.links as link, index (`${link.name}-${index}`)}
        <div class="schema" data-testid="{testId}-link-{index}">
          <h5 data-testid="{testId}-link-{index}-title">
            {link.name}{link.method ? ` → ${link.method}` : ''}
          </h5>
          {#if link.summary}
            <p data-testid="{testId}-link-{index}-summary"><strong>{link.summary}</strong></p>
          {/if}
          {#if link.description}
            <p data-testid="{testId}-link-{index}-description">{link.description}</p>
          {/if}
          {#if link.params?.length}
            <div class="extensions" data-testid="{testId}-link-{index}-params">
              {#each link.params as param (param.name)}
                <Chip
                  label={param.name}
                  value={typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}
                  code
                  testId="{testId}-link-{index}-param-{param.name}"
                />
              {/each}
            </div>
          {/if}
          {#if link.server}
            <ServerList servers={[link.server]} testId="{testId}-link-{index}-server" />
          {/if}
        </div>
      {/each}
    </section>
  {/if}

  {#if method.servers?.length}
    <ServerList servers={method.servers} testId="{testId}-servers" />
  {/if}
</CollapsibleCard>

<style>
  section,
  .schema {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
  }

  .schema {
    padding: var(--apibox-space-4);
    background: var(--apibox-bg-sunken);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }

  h4,
  h5,
  p {
    margin: 0;
  }
</style>
