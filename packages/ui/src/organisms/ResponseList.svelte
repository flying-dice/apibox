<script lang="ts">
  import type { ResponseInfo } from '@apibox/core';
  import Chip from '../atoms/Chip.svelte';
  import StatusCode from '../atoms/StatusCode.svelte';
  import SchemaTypeLabel from '../molecules/SchemaTypeLabel.svelte';
  import MediaTypeViewer from './MediaTypeViewer.svelte';
  import ServerList from './ServerList.svelte';

  interface Props {
    responses: readonly ResponseInfo[];
    testId?: string;
  }

  const { responses, testId = 'responses' }: Props = $props();
</script>

<section class="responses" aria-labelledby="{testId}-title" data-testid={testId}>
  <h3 id="{testId}-title">Responses</h3>
  {#if responses.length === 0}
    <p class="empty" data-testid="{testId}-empty">No responses were declared.</p>
  {:else}
    <div class="list">
      {#each responses as response, index (index)}
        <article class="response" data-testid="{testId}-{index}">
          <div class="heading">
            <StatusCode status={response.status} testId="{testId}-{index}-status" />
            <p>{response.description ?? 'No description'}</p>
          </div>

          {#if response.headers.length > 0}
            <section class="headers" aria-label="Response headers" data-testid="{testId}-{index}-headers">
              <h4>Headers</h4>
              {#each response.headers as header, headerIndex (headerIndex)}
                <div class="header" data-testid="{testId}-{index}-header-{headerIndex}">
                  <code>{header.name}</code>
                  <SchemaTypeLabel schema={header.schema} testId="{testId}-{index}-header-{headerIndex}-type" />
                  <span>{header.description ?? '—'}</span>
                </div>
              {/each}
            </section>
          {/if}

          {#if response.content.length > 0}
            <MediaTypeViewer content={response.content} testId="{testId}-{index}-media" />
          {/if}

          {#if response.links?.length}
            <section class="links" aria-label="Links" data-testid="{testId}-{index}-links">
              <h4>Links</h4>
              {#each response.links as link, linkIndex (`${link.name}-${linkIndex}`)}
                <div class="link" data-testid="{testId}-{index}-link-{linkIndex}">
                  <p class="link-name" data-testid="{testId}-{index}-link-{linkIndex}-name">
                    {link.name}
                    {#if link.operationId ?? link.resolvedOperationId}
                      → {link.operationId ?? link.resolvedOperationId}
                    {:else if link.operationRef}
                      → <code>{link.operationRef}</code>
                    {/if}
                  </p>
                  {#if link.description}
                    <p data-testid="{testId}-{index}-link-{linkIndex}-description">
                      {link.description}
                    </p>
                  {/if}
                  {#if link.parameters?.length}
                    <div class="chips" data-testid="{testId}-{index}-link-{linkIndex}-parameters">
                      {#each link.parameters as parameter (parameter.name)}
                        <Chip
                          label={parameter.name}
                          value={typeof parameter.value === 'string'
                            ? parameter.value
                            : JSON.stringify(parameter.value)}
                          code
                          testId="{testId}-{index}-link-{linkIndex}-parameter-{parameter.name}"
                        />
                      {/each}
                    </div>
                  {/if}
                  {#if link.server}
                    <ServerList servers={[link.server]} testId="{testId}-{index}-link-{linkIndex}-server" />
                  {/if}
                </div>
              {/each}
            </section>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .responses,
  .list,
  .response,
  .headers {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  h3,
  h4,
  p {
    margin: 0;
  }

  .response {
    padding: var(--apibox-space-4);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-lg);
  }

  .heading {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  .heading p,
  .empty {
    color: var(--apibox-fg-muted);
  }

  .headers {
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }

  .header {
    display: grid;
    grid-template-columns: minmax(8rem, 1fr) minmax(8rem, 1fr) 2fr;
    gap: var(--apibox-space-3);
    align-items: baseline;
  }

  .header code {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
  }

  .links {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
    padding: var(--apibox-space-3);
    background: var(--apibox-bg-sunken);
    border-radius: var(--apibox-radius);
  }

  .link {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
  }

  .link-name code {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }

  @media (width <= 40rem) {
    .header {
      grid-template-columns: 1fr;
    }
  }
</style>
