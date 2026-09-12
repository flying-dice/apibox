<script lang="ts">
  import type { SchemaNode } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Chip from '../atoms/Chip.svelte';
  import Code from '../atoms/Code.svelte';
  import SchemaTypeLabel from './SchemaTypeLabel.svelte';

  /**
   * One property of a schema: its name, type, requiredness, constraints and description.
   *
   * The shared row for object properties, parameters and message payload fields — all three
   * normalise to a `SchemaNode`, so all three render identically. That consistency is the
   * point: a reader learns the layout once.
   */
  interface Props {
    schema: SchemaNode;
    /** Overrides `schema.name`, for cases like a parameter with its own name. */
    name?: string;
    testId?: string;
  }

  const { schema, name, testId }: Props = $props();

  const displayName = $derived(name ?? schema.name ?? '');
  const id = $derived(testId ?? `property-${displayName || 'anonymous'}`);
  const defaultValue = $derived(
    schema.default === undefined ? undefined : formatValue(schema.default),
  );

  /**
   * Render a literal from the document.
   *
   * `JSON.stringify` returns `undefined` for a function or a bare `undefined`, which would
   * render as an empty chip; enum and default values arrive from parsed JSON or YAML, so
   * that should not happen, but an empty chip would be a silent lie if it did.
   */
  function formatValue(value: unknown): string {
    const rendered = JSON.stringify(value);
    return rendered ?? String(value);
  }

  // Inline density, not the full-fidelity `ExampleViewer` used for operation and media-type
  // examples: a schema-level example sits beside a property's type and constraints, so it is
  // truncated to one line rather than pretty-printed. The untruncated value is still reachable
  // as a native tooltip.
  const EXAMPLE_PREVIEW_LIMIT = 60;
  function formatExample(value: unknown): string {
    const rendered = formatValue(value);
    return rendered.length > EXAMPLE_PREVIEW_LIMIT
      ? `${rendered.slice(0, EXAMPLE_PREVIEW_LIMIT - 1)}…`
      : rendered;
  }

  /**
   * A one-line summary of the `xml` keyword — full enough to be useful, compact enough not
   * to earn its own section for a keyword only XML-documenting APIs ever declare.
   */
  function formatXml(xml: NonNullable<SchemaNode['xml']>): string {
    const parts: string[] = [];
    if (xml.name) parts.push(xml.name);
    if (xml.namespace) parts.push(`ns: ${xml.namespace}`);
    if (xml.prefix) parts.push(`prefix: ${xml.prefix}`);
    if (xml.attribute) parts.push('attribute');
    if (xml.wrapped) parts.push('wrapped');
    if (xml.nodeType) parts.push(xml.nodeType);
    return parts.length > 0 ? parts.join(', ') : 'declared';
  }
</script>

<div class="row" data-testid={id}>
  <div class="head">
    {#if displayName}
      <Code testId="{id}-name">{displayName}</Code>
    {/if}
    <SchemaTypeLabel {schema} testId="{id}-type" />

    {#if schema.required}
      <Badge tone="danger" variant="outline" small testId="{id}-required">required</Badge>
    {/if}
    {#if schema.deprecated}
      <Badge tone="warning" variant="outline" small testId="{id}-deprecated">deprecated</Badge>
    {/if}
    {#if schema.readOnly}
      <Badge tone="neutral" variant="outline" small testId="{id}-readonly">read-only</Badge>
    {/if}
    {#if schema.writeOnly}
      <Badge tone="neutral" variant="outline" small testId="{id}-writeonly">write-only</Badge>
    {/if}
  </div>

  {#if schema.description}
    <p class="description" data-testid="{id}-description">{schema.description}</p>
  {/if}

  {#if schema.comment}
    <!--
      `$comment` is an authoring note, not reader-facing documentation -- the spec says a
      validator MUST NOT surface it to a consumer. apibox is not a validator, but it still
      must not let a reader mistake this for a second description, hence the explicit
      "Authoring note" label and its own styling rather than folding it into `.description`.
    -->
    <p class="comment" data-testid="{id}-comment">
      <span class="comment-label">Authoring note</span>
      {schema.comment}
    </p>
  {/if}

  {#if schema.constraints?.length || defaultValue !== undefined || schema.enum?.length || schema.examples?.length || schema.xml || schema.contentEncoding || schema.contentMediaType || schema.schemaId || schema.anchor || schema.dynamicRef || schema.dynamicAnchor}
    <div class="meta">
      {#if schema.xml}
        <Chip label="xml" value={formatXml(schema.xml)} testId="{id}-xml" />
      {/if}
      {#if schema.schemaId}
        <!--
          A schema's own `$id`, not the document root's -- see SchemaNode.schemaId's doc
          comment. Distinct from `refName`: this says "I am independently addressable",
          not "I came from a named component".
        -->
        <Chip label="$id" value={schema.schemaId} code testId="{id}-schema-id" />
      {/if}
      {#if schema.anchor}
        <Chip label="$anchor" value={schema.anchor} code testId="{id}-anchor" />
      {/if}
      {#if schema.dynamicRef}
        <Chip label="$dynamicRef" value={schema.dynamicRef} code testId="{id}-dynamic-ref" />
      {/if}
      {#if schema.dynamicAnchor}
        <Chip
          label="$dynamicAnchor"
          value={schema.dynamicAnchor}
          code
          testId="{id}-dynamic-anchor"
        />
      {/if}
      {#if schema.contentEncoding}
        <Chip
          label="content encoding"
          value={schema.contentEncoding}
          code
          testId="{id}-content-encoding"
        />
      {/if}
      {#if schema.contentMediaType}
        <Chip
          label="content media type"
          value={schema.contentMediaType}
          code
          testId="{id}-content-media-type"
        />
      {/if}
      {#each schema.constraints ?? [] as constraint, index (index)}
        <Chip
          label={constraint.label}
          value={constraint.value}
          code={constraint.label === 'pattern' || constraint.label === 'format'}
          testId="{id}-constraint-{constraint.label.replace(/\s+/g, '-')}"
        />
      {/each}
      {#if defaultValue !== undefined}
        <Chip label="default" value={defaultValue} code testId="{id}-default" />
      {/if}
      {#if schema.enum && schema.enum.length > 0}
        <!--
          Grouped and labelled rather than a bare row of literals: without the label these
          read, and are announced, as unexplained values rather than the permitted set.
        -->
        <span class="enum" role="group" aria-label="Permitted values" data-testid="{id}-enum">
          <span class="enum-label">enum</span>
          {#each schema.enum as value, index (index)}
            <Chip label="" value={formatValue(value)} code testId="{id}-enum-{index}" />
          {/each}
        </span>
      {/if}
      {#if schema.examples && schema.examples.length > 0}
        <!--
          A chip group beside the property, not `ExampleViewer` -- that component renders the
          full-fidelity operation and media-type examples in a boxed section with tabs, and a
          schema-level example must not read as the same thing said twice. This is a preview:
          one truncated line per example, with the full value on hover.
        -->
        <span class="examples" role="group" aria-label="Example values" data-testid="{id}-examples">
          <span class="examples-label">{schema.examples.length > 1 ? 'examples' : 'example'}</span>
          {#each schema.examples as value, index (index)}
            <span title={formatValue(value)}>
              <Chip label="" value={formatExample(value)} code testId="{id}-example-{index}" />
            </span>
          {/each}
        </span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .row {
    padding: var(--apibox-space-3) 0;
  }

  .row + :global(.row) {
    border-top: 1px solid var(--apibox-border);
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    align-items: baseline;
  }

  .description {
    margin-top: var(--apibox-space-2);
    color: var(--apibox-fg-muted);
  }

  .comment {
    margin-top: var(--apibox-space-2);
    font-style: italic;
    color: var(--apibox-fg-muted);
  }

  .comment-label {
    margin-right: var(--apibox-space-2);
    font-style: normal;
    font-size: var(--apibox-font-size-sm);
    font-weight: 600;
    color: var(--apibox-fg-muted);
  }

  .enum {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    align-items: baseline;
  }

  .enum-label,
  .examples-label {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }

  .examples {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    align-items: baseline;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    margin-top: var(--apibox-space-2);
  }
</style>
