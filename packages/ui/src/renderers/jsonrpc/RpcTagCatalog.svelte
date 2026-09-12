<script lang="ts">
  import type { NavNode, TagInfo } from '@apibox/core';
  import Chip from '../../atoms/Chip.svelte';
  import Link from '../../atoms/Link.svelte';
  import CollapsibleCard from '../../molecules/CollapsibleCard.svelte';

  /**
   * Named entries under `components.tags`, independent of whether any method references
   * them -- unlike the tag group headers above, which only ever show a tag once a method
   * has actually used it. An orphan here (declared, referenced by nothing yet) is exactly
   * the kind of gap a reader cannot otherwise discover.
   */
  interface Props {
    tags: readonly TagInfo[];
    navigation?: NavNode;
    testId?: string;
  }

  const { tags, navigation, testId = 'tag-catalog' }: Props = $props();
</script>

{#if tags.length > 0}
  <section
    id={navigation?.id ?? 'tag-catalog'}
    class="tags"
    aria-labelledby="{testId}-title"
    data-testid={testId}
  >
    <h2 id="{testId}-title" data-testid="{testId}-title">Tags</h2>
    {#each tags as tag, index (index)}
      <CollapsibleCard
        id={navigation?.children?.[index]?.id ?? `tag-catalog-${index}`}
        testId="{testId}-{index}"
      >
        {#snippet summary()}
          <span data-testid="{testId}-{index}-name">{tag.name}</span>
        {/snippet}
        {#if tag.description}
          <p data-testid="{testId}-{index}-description">{tag.description}</p>
        {/if}
        {#if tag.externalDocs}
          <p data-testid="{testId}-{index}-external-docs">
            <Link href={tag.externalDocs.url} testId="{testId}-{index}-external-docs-link">
              {tag.externalDocs.description ?? 'Open documentation'}
            </Link>
          </p>
        {/if}
        {#if tag.extensions?.length}
          <div class="extensions" data-testid="{testId}-{index}-extensions">
            {#each tag.extensions as extension (extension.key)}
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
  .tags {
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
