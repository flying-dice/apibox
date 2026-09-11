<script lang="ts">
  import type { SchemaNode } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Button from '../atoms/Button.svelte';
  import Chip from '../atoms/Chip.svelte';
  import Icon from '../atoms/Icon.svelte';
  import PropertyRow from '../molecules/PropertyRow.svelte';
  import SchemaNodeRowSelf from './SchemaNodeRow.svelte';
  import { CHILD_BUDGET, childNodes, stopReason } from './schema-tree.js';

  /**
   * One node of a schema tree, and its children.
   *
   * Recursion happens here rather than in {@link SchemaViewer} so that each node owns its
   * own expansion state — expanding one branch must not collapse another, and the tree can
   * be arbitrarily deep.
   *
   * The stopping conditions matter more than the rendering, and there are three of them.
   * `@apibox/core` marks cycles it finds, but this component is public API and takes any
   * `SchemaNode`, so it also checks ancestry by object identity and enforces a hard depth
   * cap. Trusting the marker alone would make a hand-built or future-parser cycle a hang.
   */
  interface Props {
    schema: SchemaNode;
    /** Overrides the node's own name, for a root or an array item. */
    name?: string;
    depth?: number;
    /** Levels expanded from the start. Deeper branches begin collapsed. */
    defaultDepth?: number;
    /** Nodes on the path to this one, used to detect an unmarked cycle. */
    ancestors?: readonly SchemaNode[];
    /** Renders only this node's children, for an unremarkable viewer root. */
    hideSelf?: boolean;
    testId: string;
  }

  const {
    schema,
    name,
    depth = 0,
    defaultDepth = 1,
    ancestors = [],
    hideSelf = false,
    testId,
  }: Props = $props();

  const stop = $derived(stopReason(schema, ancestors, depth));
  const children = $derived(stop ? [] : childNodes(schema));
  const expandable = $derived(children.length > 0);

  /**
   * Expansion follows `defaultDepth` until the reader overrides it for this node.
   *
   * Written as a derived over an override rather than `$state(depth < defaultDepth)`, which
   * would capture the initial values and ignore a later change to `defaultDepth` — silently
   * breaking the expand-all control.
   */
  let expansionOverride = $state<boolean | undefined>(undefined);
  const expanded = $derived(expansionOverride ?? depth < defaultDepth);

  // Width, unlike depth, is not limited by normalisation. A generated model can carry
  // hundreds of properties, and rendering them all at once is what would block the UI.
  let showAllChildren = $state(false);
  const overBudget = $derived(children.length > CHILD_BUDGET);
  const visibleChildren = $derived(
    overBudget && !showAllChildren ? children.slice(0, CHILD_BUDGET) : children,
  );
</script>

<div class="node" class:root={hideSelf} data-testid={hideSelf ? undefined : testId} data-depth={depth}>
  {#if !hideSelf}
    <div class="line">
      {#if expandable}
        <span class="disclosure">
          <Button
            size="small"
            testId="{testId}-toggle"
            pressed={expanded}
            label={expanded ? 'Collapse' : 'Expand'}
            onclick={() => {
              expansionOverride = !expanded;
            }}
          >
            <Icon
              name={expanded ? 'chevron-down' : 'chevron-right'}
              size={13}
              testId="{testId}-toggle-icon"
            />
          </Button>
        </span>
      {:else}
        <span class="disclosure spacer" aria-hidden="true"></span>
      {/if}

      <div class="body">
        <PropertyRow {schema} {name} testId="{testId}-property" />
      </div>
    </div>

    {#if schema.dependentRequired?.length || schema.extensions?.length}
      <div class="meta">
        {#each schema.dependentRequired ?? [] as entry (entry.property)}
          <Chip
            label={`requires with "${entry.property}"`}
            value={entry.requires.join(', ')}
            testId="{testId}-dependent-required-{entry.property}"
          />
        {/each}
        {#each schema.extensions ?? [] as extension (extension.key)}
          <Chip
            label={extension.key}
            value={typeof extension.value === 'string' ? extension.value : JSON.stringify(extension.value)}
            code
            testId="{testId}-extension-{extension.key}"
          />
        {/each}
      </div>
    {/if}

    {#if schema.discriminator}
      <!--
        Rendered as its own block, not folded into `.meta`, because it explains how to pick
        one of the `oneOf`/`anyOf` children below rather than describing this node itself —
        a reader needs it read as "here's the rule", not as one more constraint chip among
        many.
      -->
      <div class="discriminator" data-testid="{testId}-discriminator">
        <Chip
          label="discriminator"
          value={schema.discriminator.propertyName}
          code
          testId="{testId}-discriminator-property"
        />
        {#each schema.discriminator.mapping ?? [] as entry (entry.value)}
          <Chip
            label={entry.value}
            value={entry.resolvedName ?? entry.target}
            code
            testId="{testId}-discriminator-mapping-{entry.value}"
          />
        {/each}
      </div>
    {/if}
  {/if}

  {#if expandable && (hideSelf || expanded)}
    <div class="children" data-testid="{testId}-children">
      {#each visibleChildren as child (child.key)}
        <SchemaNodeRowSelf
          schema={child.schema}
          name={child.name}
          depth={depth + 1}
          {defaultDepth}
          ancestors={[...ancestors, schema]}
          testId="{testId}-{child.key}"
        />
      {/each}

      {#if overBudget && !showAllChildren}
        <Button
          size="small"
          testId="{testId}-show-all"
          onclick={() => {
            showAllChildren = true;
          }}
        >
          Show all {children.length} properties
        </Button>
      {/if}
    </div>
  {/if}

  {#if !hideSelf && stop}
    <p class="stop" data-testid="{testId}-stop" data-stop={stop.kind}>
      {#if stop.kind === 'marked'}
        Recursive — see
        <Badge tone="neutral" variant="outline" small testId="{testId}-recursive-ref">
          {stop.ref}
        </Badge>
        above.
      {:else if stop.kind === 'cycle'}
        Recursive — this schema appears on its own path.
      {:else}
        Nested more than {stop.limit} levels deep; not expanded further.
      {/if}
    </p>
  {/if}
</div>

<style>
  .line {
    display: flex;
    gap: var(--apibox-space-1);
    align-items: flex-start;
  }

  .disclosure {
    display: flex;
    flex: none;
    padding-top: var(--apibox-space-3);
  }

  .spacer {
    /* Keeps rows without a toggle aligned with rows that have one. */
    width: 21px;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  .meta,
  .discriminator {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    padding: 0 0 var(--apibox-space-3) var(--apibox-space-6);
  }

  .children {
    padding-left: var(--apibox-space-4);
    margin-left: var(--apibox-space-4);
    border-left: 1px solid var(--apibox-border);
  }

  .root > .children {
    padding-left: 0;
    margin-left: 0;
    border-left: 0;
  }

  .stop {
    display: flex;
    gap: var(--apibox-space-2);
    align-items: center;
    padding: var(--apibox-space-2) 0 var(--apibox-space-2) var(--apibox-space-6);
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }
</style>
