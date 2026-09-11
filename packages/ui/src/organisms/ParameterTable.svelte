<script lang="ts">
  import type { Parameter, ParameterLocation } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Chip from '../atoms/Chip.svelte';
  import Code from '../atoms/Code.svelte';
  import SchemaTypeLabel from '../molecules/SchemaTypeLabel.svelte';

  interface Props {
    parameters: readonly Parameter[];
    testId?: string;
  }

  const { parameters, testId = 'parameters' }: Props = $props();
  const locations: readonly ParameterLocation[] = ['path', 'query', 'header', 'cookie'];

  /**
   * Serialisation is only worth a row's screen space when it says something beyond "the
   * ordinary default applies" — a scalar `string` parameter's `style`/`explode` never
   * change its wire shape, and most array/object parameters just take the location default.
   * Show the chip once a reader actually needs it: the schema is array- or object-shaped,
   * or the document explicitly declared a style/explode value (even one matching the
   * default — declaring it is itself information, per the parse-layer contract).
   */
  function showsSerialisation(parameter: Parameter): boolean {
    if (parameter.style?.declared || parameter.explode?.declared) return true;
    const types = parameter.schema?.types ?? [];
    return types.includes('array') || types.includes('object');
  }
</script>

{#if parameters.length > 0}
  <section class="parameters" aria-labelledby="{testId}-title" data-testid={testId}>
    <h3 id="{testId}-title">Parameters</h3>
    {#each locations as location (location)}
      {@const group = parameters.filter((parameter) => parameter.in === location)}
      {#if group.length > 0}
        <section class="group" aria-labelledby="{testId}-{location}-title" data-testid="{testId}-{location}">
          <h4 id="{testId}-{location}-title">{location}</h4>
          <div class="table-wrap">
            <table data-testid="{testId}-{location}-table">
              <thead data-testid="{testId}-{location}-head">
                <tr data-testid="{testId}-{location}-head-row">
                  <th data-testid="{testId}-{location}-name-heading">Name</th>
                  <th data-testid="{testId}-{location}-type-heading">Type</th>
                  <th data-testid="{testId}-{location}-description-heading">Description</th>
                </tr>
              </thead>
              <tbody data-testid="{testId}-{location}-body">
                {#each group as parameter, index (index)}
                  <tr data-testid="{testId}-{location}-{index}">
                    <td>
                      <Code testId="{testId}-{location}-{index}-name">{parameter.name}</Code>
                      {#if parameter.required}
                        <Badge
                          tone="danger"
                          variant="outline"
                          small
                          testId="{testId}-{location}-{index}-required"
                        >required</Badge>
                      {/if}
                      {#if parameter.deprecated}
                        <Badge
                          tone="warning"
                          variant="outline"
                          small
                          testId="{testId}-{location}-{index}-deprecated"
                        >deprecated</Badge>
                      {/if}
                    </td>
                    <td>
                      <SchemaTypeLabel schema={parameter.schema} testId="{testId}-{location}-{index}-type" />
                      {#if parameter.content?.length}
                        <span class="content-types">{parameter.content.map((media) => media.contentType).join(', ')}</span>
                      {/if}
                      {#if showsSerialisation(parameter)}
                        <div class="serialisation" data-testid="{testId}-{location}-{index}-serialisation">
                          <Chip
                            label="style"
                            value={parameter.style?.value ?? ''}
                            code
                            testId="{testId}-{location}-{index}-style"
                          />
                          <Chip
                            label="explode"
                            value={String(parameter.explode?.value ?? false)}
                            code
                            testId="{testId}-{location}-{index}-explode"
                          />
                          {#if parameter.allowReserved}
                            <Chip
                              label="allowReserved"
                              value="true"
                              testId="{testId}-{location}-{index}-allow-reserved"
                            />
                          {/if}
                          {#if parameter.allowEmptyValue}
                            <Chip
                              label="allowEmptyValue"
                              value="true"
                              testId="{testId}-{location}-{index}-allow-empty-value"
                            />
                          {/if}
                        </div>
                      {/if}
                    </td>
                    <td>{parameter.description ?? '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {/if}
    {/each}
  </section>
{/if}

<style>
  .parameters,
  .group {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  h3,
  h4 {
    margin: 0;
  }

  h4 {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
    text-transform: uppercase;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: var(--apibox-space-3);
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--apibox-border);
  }

  th {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
    background: var(--apibox-bg-sunken);
  }

  td:first-child {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    align-items: center;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .content-types {
    display: block;
    margin-top: var(--apibox-space-1);
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }

  .serialisation {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    margin-top: var(--apibox-space-2);
  }
</style>
