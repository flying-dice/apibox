<script lang="ts">
  import { schemaTypeLabel } from '@apibox/core/schema';
  import type { SchemaNode } from '@apibox/core';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';
  import SchemaNodeRow from './SchemaNodeRow.svelte';
  import { childNodes, treeDepth } from './schema-tree.js';

  /**
   * A schema, rendered as an expandable tree.
   *
   * The single most reused component in the project: OpenAPI request and response bodies,
   * AsyncAPI message payloads and JSON-RPC params all normalise to the same `SchemaNode`,
   * so all three are read the same way. A reader learns this layout once.
   *
   * The root itself is not shown as a row when it is an unremarkable object — a bare
   * `object` line above its own properties is noise. It is shown when it carries something
   * a reader needs, such as a description, composition or reference marker.
   */
  interface Props {
    schema?: SchemaNode;
    /** Levels expanded from the start. */
    defaultDepth?: number;
    /** Hides the expand-all control, for short schemas embedded in a table cell. */
    compact?: boolean;
    testId?: string;
  }

  const { schema, defaultDepth = 1, compact = false, testId = 'schema' }: Props = $props();

  const children = $derived(schema ? childNodes(schema) : []);

  /**
   * Whether to render the root as its own row.
   *
   * Skipped for a plain container — a bare `object` line above its own properties is noise,
   * so the tree starts at the properties a reader came for. It is drawn when the root
   * carries something of its own: a description, composition, or a reference marker.
   */
  const showRoot = $derived(
    Boolean(
      schema &&
        (children.length === 0 ||
          schema.description ||
          schema.compositions?.length ||
          schema.circularRef ||
          schema.unresolvedRef ||
          // As with `description`: without its own row, a root's `dependentRequired`,
          // `x-*` extensions, or closed-schema markers would have nowhere to render at all,
          // since `SchemaNodeRow` only draws that meta block when it is not hidden.
          schema.dependentRequired?.length ||
          schema.extensions?.length ||
          schema.allowsAdditionalProperties === false ||
          schema.allowsUnevaluatedProperties === false ||
          schema.allowsUnevaluatedItems === false ||
          schema.discriminator),
    ),
  );

  /** The depth that would show everything, computed rather than assumed. */
  const fullDepth = $derived(schema ? treeDepth(schema) + 1 : 0);

  // Remounts the tree, resetting every node to the new depth. Cheap, and far simpler than
  // threading an expansion store through an arbitrarily deep recursion.
  let depthOverride = $state.raw<{ schema: SchemaNode; depth: number } | undefined>();
  const effectiveDepth = $derived(
    depthOverride !== undefined && depthOverride.schema === schema
      ? depthOverride.depth
      : defaultDepth,
  );
  const allExpanded = $derived(effectiveDepth >= fullDepth);

</script>

{#if !schema}
  <p class="empty" data-testid="{testId}-empty">No schema was declared.</p>
{:else}
  <div class="viewer" data-testid={testId}>
    {#if !compact && children.length > 0}
      <div class="toolbar">
        <span class="summary" data-testid="{testId}-summary">{schemaTypeLabel(schema)}</span>
        <Button
          size="small"
          testId="{testId}-expand-all"
          onclick={() => {
            // The tree's own depth rather than a guessed constant: a fixed number would
            // leave a deeper schema partly collapsed while the button still said "expand
            // all", and would silently *reduce* expansion for a caller asking for more.
            depthOverride = {
              schema,
              depth: allExpanded ? defaultDepth : fullDepth,
            };
          }}
        >
          <Icon
            name={allExpanded ? 'chevron-down' : 'chevron-right'}
            size={13}
            testId="{testId}-expand-all-icon"
          />
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>
    {/if}

    <!--
      Keyed on the schema as well as the depth: replacing the payload must reset expansion,
      or a branch a reader opened in one example arrives open in the next.
    -->
    {#key `${effectiveDepth}`}
      {#key schema}
        {#if showRoot}
          <SchemaNodeRow {schema} defaultDepth={effectiveDepth} testId="{testId}-root" />
        {:else}
          <!--
            The recursive row also owns the root's width budget. `hideSelf` suppresses only
            the redundant container line; children remain at depth 1 and use the same
            expansion, cycle and truncation path as every nested node.
          -->
          <SchemaNodeRow {schema} hideSelf defaultDepth={effectiveDepth} testId={testId} />
        {/if}
      {/key}
    {/key}
  </div>
{/if}

<style>
  .viewer {
    min-width: 0;
  }

  .toolbar {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--apibox-space-2);
    border-bottom: 1px solid var(--apibox-border);
  }

  .summary {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
    color: var(--apibox-fg-muted);
  }

  .empty {
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg-muted);
  }
</style>
