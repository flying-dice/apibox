<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { normaliseSchema } from '@apibox/core';
  import type { SchemaNode } from '@apibox/core';
  import SchemaViewer from './SchemaViewer.svelte';

  const { Story } = defineMeta({
    title: 'Organisms/SchemaViewer',
    component: SchemaViewer,
    parameters: {
      docs: {
        description: {
          component:
            'One renderer for every schema in the project. OpenAPI bodies, AsyncAPI ' +
            'payloads and JSON-RPC params all normalise to the same tree, so a reader ' +
            'learns this layout once.',
        },
      },
    },
  });

  const petSource: Record<string, unknown> = {
    type: 'object',
    description: 'A pet available in the store.',
    required: ['id', 'name', 'status'],
    properties: {
      id: { type: 'integer', format: 'int64', readOnly: true, description: 'Unique identifier.' },
      name: { type: 'string', minLength: 1, maxLength: 64, description: "The pet's name." },
      status: {
        type: 'string',
        description: 'Availability of the pet.',
        enum: ['available', 'pending', 'sold'],
        default: 'available',
      },
      tags: { type: 'array', description: 'Free-form labels.', items: { type: 'string' } },
      owner: {
        type: 'object',
        description: 'Who the pet belongs to.',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              line1: { type: 'string' },
              city: { type: 'string' },
              postcode: { type: 'string', pattern: '^[A-Z0-9 ]+$' },
            },
          },
        },
      },
    },
  };
  const petNames = new Map([[petSource, 'Pet']]);
  const PET = normaliseSchema(petSource, { names: petNames }) as SchemaNode;
  const PET_LIST = normaliseSchema(
    { type: 'array', description: 'Pets returned by the operation.', items: petSource },
    { names: petNames },
  ) as SchemaNode;

  /** The shape a dereferenced recursive `$ref` actually produces: a cyclic object graph. */
  const recursivePet = (() => {
    const pet: Record<string, unknown> = {
      type: 'object',
      description: 'A pet whose relationships refer back to the same Pet schema.',
      required: ['id'],
      properties: { id: { type: 'string' } },
    };
    (pet.properties as Record<string, unknown>).friends = { type: 'array', items: pet };
    (pet.properties as Record<string, unknown>).parent = pet;
    return normaliseSchema(pet, { names: new Map([[pet, 'Pet']]) }) as SchemaNode;
  })();

  const COMPOSED = normaliseSchema({
    description: 'A payment method. The document offers three shapes, not a merged one.',
    oneOf: [
      {
        type: 'object',
        title: 'Card',
        required: ['number'],
        properties: { number: { type: 'string' }, expiry: { type: 'string', format: 'date' } },
      },
      {
        type: 'object',
        title: 'Bank transfer',
        required: ['iban'],
        properties: { iban: { type: 'string' } },
      },
      { type: 'string', title: 'Saved method token' },
    ],
  }) as SchemaNode;

  const TUPLE = normaliseSchema({
    type: 'array',
    description: 'A coordinate pair, positionally typed.',
    prefixItems: [
      { type: 'number', description: 'Latitude' },
      { type: 'number', description: 'Longitude' },
    ],
  }) as SchemaNode;

  const BROKEN = normaliseSchema({
    type: 'object',
    required: ['id', 'external'],
    properties: {
      id: { type: 'string' },
      external: { $ref: 'https://example.invalid/nope.yaml#/components/schemas/Missing' },
    },
  }) as SchemaNode;
</script>

<Story name="Object">
  <div class="sheet"><SchemaViewer schema={PET} /></div>
</Story>

<Story name="Array of references">
  <div class="sheet"><SchemaViewer schema={PET_LIST} defaultDepth={2} /></div>
</Story>

<Story name="Recursive">
  <div class="sheet">
    <p class="note">
      Dereferencing turns a recursive <code>$ref</code> into a genuinely cyclic object graph.
      The viewer stops at the back-reference and offers a pointer instead of descending —
      expanding <code>parent</code> is not offered at all.
    </p>
    <SchemaViewer schema={recursivePet} defaultDepth={3} />
  </div>
</Story>

<Story name="Composition">
  <div class="sheet"><SchemaViewer schema={COMPOSED} defaultDepth={2} /></div>
</Story>

<Story name="Tuple">
  <div class="sheet"><SchemaViewer schema={TUPLE} defaultDepth={2} /></div>
</Story>

<Story name="Unresolved reference">
  <div class="sheet">
    <p class="note">
      When a reference cannot be followed the property is marked, not silently rendered as
      an empty schema — the reader needs to tell "accepts anything" from "we could not
      follow this".
    </p>
    <SchemaViewer schema={BROKEN} />
  </div>
</Story>

<Story name="Empty">
  <div class="sheet"><SchemaViewer /></div>
</Story>

<style>
  .sheet {
    max-width: 60rem;
    padding: var(--apibox-space-5);
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg);
    background: var(--apibox-bg);
  }

  .note {
    max-width: 68ch;
    margin-bottom: var(--apibox-space-4);
    color: var(--apibox-fg-muted);
  }

  code {
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
  }
</style>
