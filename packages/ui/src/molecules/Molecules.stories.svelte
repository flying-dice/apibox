<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { SchemaNode } from '@apibox/core';
  import CodeBlock from './CodeBlock.svelte';
  import KeyValueRow from './KeyValueRow.svelte';
  import NavItem from './NavItem.svelte';
  import PropertyRow from './PropertyRow.svelte';
  import SchemaTypeLabel from './SchemaTypeLabel.svelte';
  import SearchInput from './SearchInput.svelte';
  import TabBar from './TabBar.svelte';

  const { Story } = defineMeta({
    title: 'Molecules/Overview',
    parameters: {
      docs: {
        description: {
          component:
            'Components assembled from atoms. These are the pieces the format renderers ' +
            'are built out of.',
        },
      },
    },
  });

  const EXAMPLE = JSON.stringify(
    [
      { id: 1, name: 'Fido', status: 'available' },
      { id: 2, name: 'Whiskers', status: 'pending' },
    ],
    null,
    2,
  );

  const LONG = Array.from({ length: 24 }, (_, i) => `  "line-${i}": ${i},`).join('\n');

  const SCHEMAS: SchemaNode[] = [
    {
      name: 'id',
      types: ['integer'],
      format: 'int64',
      required: true,
      readOnly: true,
      description: 'Unique identifier.',
      constraints: [{ label: 'format', value: 'int64' }],
    },
    {
      name: 'name',
      types: ['string'],
      required: true,
      description: "The pet's name.",
      constraints: [
        { label: 'min length', value: '1' },
        { label: 'max length', value: '64' },
      ],
    },
    {
      name: 'status',
      types: ['string'],
      description: 'Availability of the pet.',
      enum: ['available', 'pending', 'sold'],
      default: 'available',
    },
    {
      name: 'tags',
      types: ['array'],
      items: { types: ['string'] },
      description: 'Free-form labels.',
    },
    {
      name: 'parent',
      types: ['object'],
      refName: 'Pet',
      circularRef: 'Pet',
      description: 'The pet this one descends from, if known.',
    },
    {
      name: 'external',
      types: [],
      refName: 'Missing',
      unresolvedRef: 'https://example.invalid/nope.yaml#/Missing',
      required: true,
      description: 'A reference the document pointed at but we could not follow.',
    },
  ];

  const MEDIA_TABS = [
    { id: 'json', label: 'application/json' },
    { id: 'xml', label: 'application/xml' },
    { id: 'text', label: 'text/plain' },
  ];
</script>

<script lang="ts">
  let selectedTab = $state('json');
  let filter = $state('');
</script>

<Story name="Code blocks">
  <div class="sheet">
    <CodeBlock code={EXAMPLE} language="json" label="application/json · twoPets" />
    <CodeBlock code={'{\n' + LONG + '\n}'} language="json" label="A long payload" maxLines={6} />
  </div>
</Story>

<Story name="Schema properties">
  <div class="sheet">
    <p class="note">
      One row type serves object properties, parameters and message payloads, because all
      three normalise to the same schema node. Note the last two: a recursive reference stops
      rather than descending, and an unresolved one says so instead of rendering as empty.
    </p>
    <div class="panel">
      {#each SCHEMAS as schema (schema.name)}
        <PropertyRow {schema} />
      {/each}
    </div>
  </div>
</Story>

<Story name="Type labels">
  <div class="sheet">
    <div class="stack">
      <SchemaTypeLabel schema={{ types: ['string'], format: 'uuid' }} />
      <SchemaTypeLabel schema={{ types: ['array'], items: { types: ['string'] } }} />
      <SchemaTypeLabel schema={{ types: ['array', 'null'], items: { types: ['string'] } }} />
      <SchemaTypeLabel schema={{ types: ['object'], refName: 'Pet' }} />
      <SchemaTypeLabel
        schema={{ types: ['array'], tupleItems: [{ types: ['string'] }, { types: ['number'] }] }}
      />
      <SchemaTypeLabel schema={{ types: ['object'], refName: 'Pet', circularRef: 'Pet' }} />
      <SchemaTypeLabel schema={{ types: [], unresolvedRef: 'https://example.invalid/x.yaml' }} />
    </div>
  </div>
</Story>

<Story name="Navigation and controls">
  <div class="sheet">
    <div class="columns">
      <div class="panel narrow">
        <SearchInput value={filter} onchange={(next) => (filter = next)} />
        <div class="nav">
          <NavItem href="#/pets" label="pets" testId="nav-tag-pets" />
          <NavItem
            href="#/pets/listPets"
            label="List pets"
            badge="GET"
            badgeTone="get"
            depth={1}
            current
            testId="nav-listpets"
          />
          <NavItem
            href="#/pets/createPet"
            label="Create a pet"
            badge="POST"
            badgeTone="post"
            depth={1}
            testId="nav-createpet"
          />
          <NavItem
            href="#/pets/deletePet"
            label="Delete a pet"
            badge="DELETE"
            badgeTone="delete"
            depth={1}
            deprecated
            testId="nav-deletepet"
          />
        </div>
      </div>

      <div class="panel">
        <TabBar
          tabs={MEDIA_TABS}
          selected={selectedTab}
          label="Media type"
          onselect={(id) => (selectedTab = id)}
        />
        <div class="tab-body">
          <CodeBlock code={EXAMPLE} language={selectedTab} label={selectedTab} />
        </div>

        <dl class="kv">
          <KeyValueRow label="Version">1.4.0</KeyValueRow>
          <KeyValueRow label="License">MIT</KeyValueRow>
          <KeyValueRow label="Contact">support@example.com</KeyValueRow>
        </dl>
      </div>
    </div>
  </div>
</Story>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-5);
    padding: var(--apibox-space-5);
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg);
    background: var(--apibox-bg);
  }

  .note {
    max-width: 68ch;
    color: var(--apibox-fg-muted);
  }

  .columns {
    display: grid;
    grid-template-columns: minmax(200px, 260px) 1fr;
    gap: var(--apibox-space-5);
    align-items: start;
  }

  .panel {
    padding: var(--apibox-space-3);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius);
  }

  .narrow {
    background: var(--apibox-bg-sunken);
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-1);
    margin-top: var(--apibox-space-3);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  .tab-body {
    margin: var(--apibox-space-3) 0;
  }

  .kv {
    margin: 0;
  }

  @media (width <= 44rem) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>
