import type { SchemaNode } from '@apibox/core';
import { normaliseSchema } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SchemaViewer from './SchemaViewer.svelte';
import { CHILD_BUDGET } from './schema-tree.js';

const PET: SchemaNode = {
  name: 'Pet',
  refName: 'Pet',
  types: ['object'],
  properties: [
    { name: 'id', types: ['integer'], required: true },
    {
      name: 'owner',
      types: ['object'],
      properties: [
        { name: 'name', types: ['string'], required: true },
        {
          name: 'address',
          types: ['object'],
          properties: [{ name: 'city', types: ['string'] }],
        },
      ],
    },
  ],
};

describe('SchemaViewer', () => {
  it('says so when there is no schema rather than rendering nothing', () => {
    render(SchemaViewer, {});
    expect(screen.getByTestId('schema-empty')).toBeInTheDocument();
  });

  it('renders top-level properties without a redundant root row', () => {
    // A bare `object` line above its own properties is noise.
    render(SchemaViewer, { schema: PET });
    expect(screen.getByTestId('schema-p-id-property-name')).toHaveTextContent('id');
    expect(screen.getByTestId('schema-p-owner-property-name')).toHaveTextContent('owner');
  });

  it('shows the root when it carries something a reader needs', () => {
    render(SchemaViewer, {
      schema: { ...PET, description: 'A pet available in the store.' },
    });
    expect(screen.getByTestId('schema-root')).toBeInTheDocument();
  });

  it('shows the root for a bare $comment, and renders it distinctly from description', () => {
    render(SchemaViewer, {
      schema: {
        ...PET,
        description: 'A pet available in the store.',
        comment: 'Internal: pending a rename to Animal in the next major version.',
      },
    });
    expect(screen.getByTestId('schema-root')).toBeInTheDocument();

    const description = screen.getByTestId('schema-root-property-description');
    expect(description).toHaveTextContent('A pet available in the store.');
    expect(description).not.toHaveTextContent('Internal: pending a rename');

    const comment = screen.getByTestId('schema-root-property-comment');
    expect(comment).toHaveTextContent('Authoring note');
    expect(comment).toHaveTextContent(
      'Internal: pending a rename to Animal in the next major version.',
    );
    expect(comment).not.toHaveTextContent('A pet available in the store.');
  });

  it('collapses below the default depth and expands on request', async () => {
    render(SchemaViewer, { schema: PET, defaultDepth: 1 });

    // `owner` is visible; its own properties are not, until it is expanded.
    expect(screen.queryByTestId('schema-p-owner-p-name-property-name')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('schema-p-owner-toggle'));
    expect(screen.getByTestId('schema-p-owner-p-name-property-name')).toHaveTextContent('name');
  });

  it('expands the whole tree from the toolbar', async () => {
    render(SchemaViewer, { schema: PET, defaultDepth: 1 });
    expect(
      screen.queryByTestId('schema-p-owner-p-address-p-city-property'),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('schema-expand-all'));

    // Two levels below the default depth, so this only appears if the control reaches
    // every node rather than one.
    expect(screen.getByTestId('schema-p-owner-p-address-p-city-property')).toBeInTheDocument();
  });

  it('expands branches independently', async () => {
    render(SchemaViewer, {
      schema: {
        types: ['object'],
        properties: [
          { name: 'a', types: ['object'], properties: [{ name: 'a1', types: ['string'] }] },
          { name: 'b', types: ['object'], properties: [{ name: 'b1', types: ['string'] }] },
        ],
      },
      defaultDepth: 1,
    });

    await userEvent.click(screen.getByTestId('schema-p-a-toggle'));
    expect(screen.getByTestId('schema-p-a-p-a1-property')).toBeInTheDocument();
    // Expanding one branch must not open or close the other.
    expect(screen.queryByTestId('schema-p-b-p-b1-property')).not.toBeInTheDocument();
  });

  it('refuses to descend into a recursive reference', () => {
    // The reason this matters: a dereferenced spec is a genuinely cyclic object graph, so
    // descending would recurse until the stack gives out.
    render(SchemaViewer, {
      schema: {
        types: ['object'],
        properties: [
          {
            name: 'parent',
            types: ['object'],
            refName: 'Pet',
            circularRef: 'Pet',
            properties: [{ name: 'never-rendered', types: ['string'] }],
          },
        ],
      },
    });

    expect(screen.getByTestId('schema-p-parent-stop')).toHaveAttribute('data-stop', 'marked');
    expect(screen.queryByTestId('schema-p-parent-toggle')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('schema-p-parent-p-never-rendered-property'),
    ).not.toBeInTheDocument();
  });

  it('renders composition as alternatives rather than a merged shape', () => {
    render(SchemaViewer, {
      schema: {
        types: [],
        compositions: [
          {
            kind: 'oneOf',
            options: [
              { name: 'option 1', types: ['string'] },
              { name: 'option 2', types: ['integer'] },
            ],
          },
        ],
      },
    });

    // Composition on the root means the root row is drawn, so options hang off it.
    expect(screen.getByTestId('schema-root-oneOf-option-1-property')).toBeInTheDocument();
    expect(screen.getByTestId('schema-root-oneOf-option-2-property')).toBeInTheDocument();
  });

  it('renders array items', () => {
    render(SchemaViewer, {
      schema: { types: ['array'], items: { types: ['string'] } },
    });
    expect(screen.getByTestId('schema-items-property-name')).toHaveTextContent('items');
  });

  it('renders every position of a tuple', () => {
    // Previously covered only by an `items` test, which would have passed with tuple
    // support removed entirely.
    render(SchemaViewer, {
      schema: {
        types: ['array'],
        tupleItems: [
          { types: ['number'], description: 'Latitude' },
          { types: ['number'], description: 'Longitude' },
        ],
      },
    });

    expect(screen.getByTestId('schema-t-0-property-name')).toHaveTextContent('[0]');
    expect(screen.getByTestId('schema-t-1-property-name')).toHaveTextContent('[1]');
  });

  it('expands a tree deeper than any fixed guess', async () => {
    // "Expand all" once meant a hard-coded 99, which left a deeper schema partly collapsed
    // while still claiming to have expanded everything.
    let deep: SchemaNode = { name: 'leaf', types: ['string'] };
    for (let i = 0; i < 20; i += 1) {
      deep = { name: `level-${i}`, types: ['object'], properties: [deep] };
    }

    render(SchemaViewer, { schema: deep, defaultDepth: 1 });
    await userEvent.click(screen.getByTestId('schema-expand-all'));

    // The leaf sits 20 levels down; it is only reachable if the control used the tree's
    // real depth.
    const path = Array.from({ length: 19 }, (_, index) => `p-level-${18 - index}`);
    expect(
      screen.getByTestId(['schema', ...path, 'p-leaf', 'property'].join('-')),
    ).toBeInTheDocument();
  });

  it('forgets expansion when the schema is replaced', async () => {
    // A branch opened in one payload must not arrive open in the next.
    const makeSchema = (child: string): SchemaNode => ({
      types: ['object'],
      properties: [
        { name: 'owner', types: ['object'], properties: [{ name: child, types: ['string'] }] },
      ],
    });

    const { rerender } = render(SchemaViewer, { schema: makeSchema('first'), defaultDepth: 1 });
    await userEvent.click(screen.getByTestId('schema-p-owner-toggle'));
    expect(screen.getByTestId('schema-p-owner-p-first-property')).toBeInTheDocument();

    await rerender({ schema: makeSchema('second'), defaultDepth: 1 });
    expect(screen.queryByTestId('schema-p-owner-p-second-property')).not.toBeInTheDocument();
  });

  it('forgets toolbar expansion when the schema is replaced', async () => {
    const makeSchema = (leaf: string): SchemaNode => ({
      types: ['object'],
      properties: [
        {
          name: 'owner',
          types: ['object'],
          properties: [
            { name: 'address', types: ['object'], properties: [{ name: leaf, types: ['string'] }] },
          ],
        },
      ],
    });

    const { rerender } = render(SchemaViewer, { schema: makeSchema('first'), defaultDepth: 1 });
    await userEvent.click(screen.getByTestId('schema-expand-all'));
    expect(screen.getByTestId('schema-p-owner-p-address-p-first-property')).toBeInTheDocument();

    await rerender({ schema: makeSchema('second'), defaultDepth: 1 });
    expect(
      screen.queryByTestId('schema-p-owner-p-address-p-second-property'),
    ).not.toBeInTheDocument();
  });

  it('truncates a very wide object and offers the rest', async () => {
    // Normalisation limits depth but not width; a generated model can carry hundreds of
    // properties, and rendering them all at once is what would block the UI.
    const properties = Array.from({ length: CHILD_BUDGET + 25 }, (_, i) => ({
      name: `field${i}`,
      types: ['string'],
    }));
    render(SchemaViewer, { schema: { types: ['object'], properties } });

    expect(
      screen.queryByTestId(`schema-p-field${CHILD_BUDGET + 10}-property`),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('schema-show-all'));
    expect(screen.getByTestId(`schema-p-field${CHILD_BUDGET + 10}-property`)).toBeInTheDocument();
  });

  it('restores the width budget when the schema is replaced', async () => {
    const makeSchema = (prefix: string): SchemaNode => ({
      types: ['object'],
      properties: Array.from({ length: CHILD_BUDGET + 1 }, (_, i) => ({
        name: `${prefix}${i}`,
        types: ['string'],
      })),
    });

    const { rerender } = render(SchemaViewer, { schema: makeSchema('first') });
    await userEvent.click(screen.getByTestId('schema-show-all'));
    expect(screen.getByTestId(`schema-p-first${CHILD_BUDGET}-property`)).toBeInTheDocument();

    await rerender({ schema: makeSchema('second') });
    expect(screen.queryByTestId(`schema-p-second${CHILD_BUDGET}-property`)).not.toBeInTheDocument();
    expect(screen.getByTestId('schema-show-all')).toBeInTheDocument();
  });

  it('stops at an unmarked cycle rather than hanging', () => {
    // The parser marks cycles it finds, but this component takes any SchemaNode.
    const node: SchemaNode = { name: 'Node', types: ['object'], properties: [] };
    node.properties = [node];

    render(SchemaViewer, { schema: node, defaultDepth: 5 });
    expect(screen.getAllByTestId(/-stop$/).length).toBeGreaterThan(0);
  });

  it('renders additionalProperties as its own branch', () => {
    render(SchemaViewer, {
      schema: {
        types: ['object'],
        allowsAdditionalProperties: true,
        additionalProperties: { types: ['integer'] },
      },
    });
    expect(screen.getByTestId('schema-additional-property-name')).toHaveTextContent(
      'additional properties',
    );
  });

  it('distinguishes a closed schema from one that never mentioned additionalProperties', () => {
    // `false` is a real assertion ("no extra properties allowed"); an unspecified schema
    // must not look the same on screen.
    render(SchemaViewer, {
      schema: { types: ['object'], allowsAdditionalProperties: false },
      testId: 'closed',
    });
    expect(screen.getByTestId('closed-root-closed-additional-properties')).toHaveTextContent(
      'no additional properties',
    );

    render(SchemaViewer, {
      schema: { types: ['object'] },
      testId: 'open',
    });
    expect(screen.queryByTestId('open-closed-additional-properties')).not.toBeInTheDocument();
  });

  it('renders if/then/else, contains and propertyNames as their own branches', () => {
    render(SchemaViewer, {
      schema: {
        types: ['object'],
        conditional: {
          if: { types: ['string'] },
          // biome-ignore lint/suspicious/noThenProperty: JSON Schema keyword, not a thenable.
          then: { types: ['string'], name: 'zip' },
          else: { types: ['string'], name: 'postalCode' },
        },
        contains: { types: ['integer'] },
        propertyNames: { types: ['string'] },
      },
    });
    expect(screen.getByTestId('schema-then-zip-property-name')).toHaveTextContent('zip');
    expect(screen.getByTestId('schema-else-postalCode-property-name')).toHaveTextContent(
      'postalCode',
    );
    expect(screen.getByTestId('schema-contains-property-name')).toHaveTextContent('contains');
    expect(screen.getByTestId('schema-property-names-property-name')).toHaveTextContent(
      'property names',
    );
  });

  it('renders dependentRequired and x-* extensions as chips on the owning row', () => {
    render(SchemaViewer, {
      schema: {
        types: ['object'],
        dependentRequired: [{ property: 'creditCard', requires: ['cvv'] }],
        extensions: [{ key: 'x-internal-id', value: 42 }],
      },
    });
    expect(screen.getByTestId('schema-root-dependent-required-creditCard')).toHaveTextContent(
      'cvv',
    );
    expect(screen.getByTestId('schema-root-extension-x-internal-id')).toHaveTextContent('42');
  });

  it('renders a discriminator near the composition it disambiguates, with a resolved mapping', () => {
    render(SchemaViewer, {
      schema: {
        types: [],
        compositions: [
          {
            kind: 'oneOf',
            options: [
              { name: 'Cat', refName: 'Cat', types: ['object'] },
              { name: 'Dog', refName: 'Dog', types: ['object'] },
            ],
          },
        ],
        discriminator: {
          propertyName: 'species',
          mapping: [
            { value: 'cat', target: '#/components/schemas/Cat', resolvedName: 'Cat' },
            { value: 'dog', target: '#/components/schemas/Dog', resolvedName: undefined },
          ],
        },
      },
    });

    expect(screen.getByTestId('schema-root-discriminator-property')).toHaveTextContent('species');
    // A resolved mapping target shows the catalogue name a reader already knows.
    expect(screen.getByTestId('schema-root-discriminator-mapping-cat')).toHaveTextContent('Cat');
    // An unresolved target still shows something rather than being dropped.
    expect(screen.getByTestId('schema-root-discriminator-mapping-dog')).toHaveTextContent(
      '#/components/schemas/Dog',
    );
  });

  it('renders a schema marked recursive by the core normaliser without hanging', () => {
    // Cross-package integration through Core's public API, without coupling this package
    // to Core's private test-fixture layout.
    const raw: Record<string, unknown> = {
      type: 'object',
      properties: { id: { type: 'string' } },
    };
    (raw.properties as Record<string, unknown>).parent = raw;
    const node = normaliseSchema(raw, { names: new Map([[raw, 'Node']]) }, 'Node');

    render(SchemaViewer, { schema: node, defaultDepth: 99 });
    expect(screen.getByTestId('schema-p-id-property-name')).toHaveTextContent('id');
    expect(screen.getByTestId('schema-p-parent-stop')).toHaveAttribute('data-stop', 'marked');
  });

  it('handles a schema normalised straight from JSON Schema', () => {
    const schema = normaliseSchema({
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } },
    });

    render(SchemaViewer, { schema });
    expect(screen.getByTestId('schema-p-id-property-required')).toBeInTheDocument();
  });
});
