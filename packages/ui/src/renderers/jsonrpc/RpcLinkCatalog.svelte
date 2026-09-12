<script lang="ts">
  import type { NavNode, RpcLink } from '@apibox/core';
  import Chip from '../../atoms/Chip.svelte';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';
  import ServerList from '../../organisms/ServerList.svelte';

  /**
   * Named entries under `components.links`, reusing the same shape a method's own `links`
   * already uses (see `RpcMethodCard`'s own Links section) -- shown independent of any
   * specific method's result, so a catalogue entry's own `method` field is what tells a
   * reader where it goes, rather than the context a method-embedded link relies on.
   */
  interface Props {
    links: readonly RpcLink[];
    navigation?: NavNode;
    testId?: string;
  }

  const { links, navigation, testId = 'link-catalog' }: Props = $props();
</script>

{#if links.length > 0}
  <section
    id={navigation?.id ?? 'link-catalog'}
    class="links"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title" data-testid="{testId}-title">Links</h2>
    {#each links as link, index (index)}
      <CollapsibleCard
        id={navigation?.children?.[index]?.id ?? `link-catalog-${index}`}
        testId="{testId}-{index}"
      >
        {#snippet summary()}
          <span data-testid="{testId}-{index}-name">
            {link.name}{link.method ? ` → ${link.method}` : ''}
          </span>
        {/snippet}
        {#if link.summary}
          <p data-testid="{testId}-{index}-summary"><strong>{link.summary}</strong></p>
        {/if}
        {#if link.description}
          <p data-testid="{testId}-{index}-description">{link.description}</p>
        {/if}
        {#if link.params?.length}
          <div class="extensions" data-testid="{testId}-{index}-params">
            {#each link.params as param (param.name)}
              <Chip
                label={param.name}
                value={typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}
                code
                testId="{testId}-{index}-param-{param.name}"
              />
            {/each}
          </div>
        {/if}
        {#if link.server}
          <ServerList servers={[link.server]} testId="{testId}-{index}-server" />
        {/if}
        {#if link.extensions?.length}
          <div class="extensions" data-testid="{testId}-{index}-extensions">
            {#each link.extensions as extension (extension.key)}
              <Chip
                label={extension.key}
                value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
                code
                testId="{testId}-{index}-extension-{extension.key}"
              />
            {/each}
          </div>
        {/if}
      </CollapsibleCard>
    {/each}
  </section>
{/if}

<style>
  /* No gap between rows: the hairline in CollapsibleCard carries the separation -- same
     density convention as SchemaCatalog and RpcContentDescriptorCatalog. */
  .links {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  h2 {
    margin: 0 0 var(--apibox-space-4);
  }

  p {
    margin: 0;
  }

  .extensions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
