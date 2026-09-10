import { describe, expect, it } from 'vitest';
import { normaliseSchema, schemaTypeLabel } from './schema.js';

describe('normaliseSchema', () => {
  it('flattens an object into ordered properties, marking required ones', () => {
    const node = normaliseSchema({
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    });

    expect(node?.types).toEqual(['object']);
    expect(node?.properties?.map((p) => p.name)).toEqual(['id', 'name']);
    expect(node?.properties?.[0]?.required).toBe(true);
    expect(node?.properties?.[1]?.required).toBe(false);
  });

  it('infers `object` when a schema has properties but no declared type', () => {
    const node = normaliseSchema({ properties: { a: { type: 'string' } } });
    expect(node?.types).toEqual(['object']);
  });

  it('collects constraint keywords as chips, skipping absent ones', () => {
    const node = normaliseSchema({ type: 'string', format: 'uuid', minLength: 1, maxLength: 36 });
    expect(node?.constraints).toEqual([
      { label: 'format', value: 'uuid' },
      { label: 'min length', value: '1' },
      { label: 'max length', value: '36' },
    ]);
  });

  it('reads examples from either spelling', () => {
    expect(normaliseSchema({ type: 'string', example: 'a' })?.examples).toEqual(['a']);
    expect(normaliseSchema({ type: 'string', examples: ['a', 'b'] })?.examples).toEqual(['a', 'b']);
  });

  it('treats a `const` as a single-valued enum', () => {
    expect(normaliseSchema({ const: 'fixed' })?.enum).toEqual(['fixed']);
  });

  it('preserves composition rather than merging it', () => {
    const node = normaliseSchema({ oneOf: [{ type: 'string' }, { type: 'integer' }] });
    expect(node?.compositions).toHaveLength(1);
    expect(node?.compositions?.[0]?.kind).toBe('oneOf');
    expect(node?.compositions?.[0]?.options).toHaveLength(2);
  });

  it('keeps every composition keyword when a schema uses several at once', () => {
    // The mixin-plus-variant pattern: `allOf` for shared fields, `oneOf` for the variants.
    const node = normaliseSchema({
      allOf: [{ type: 'object', properties: { id: { type: 'string' } } }],
      oneOf: [{ type: 'object' }, { type: 'string' }],
    });
    expect(node?.compositions?.map((c) => c.kind)).toEqual(['allOf', 'oneOf']);
  });

  it('records a `not` alongside other composition keywords', () => {
    const node = normaliseSchema({ allOf: [{ type: 'object' }], not: { type: 'string' } });
    expect(node?.compositions?.map((c) => c.kind)).toEqual(['allOf', 'not']);
  });

  it('distinguishes a closed schema from one that simply says nothing', () => {
    expect(
      normaliseSchema({ type: 'object', properties: {}, additionalProperties: false })
        ?.allowsAdditionalProperties,
    ).toBe(false);
    expect(
      normaliseSchema({ type: 'object', properties: {} })?.allowsAdditionalProperties,
    ).toBeUndefined();
    expect(
      normaliseSchema({ type: 'object', additionalProperties: true })?.allowsAdditionalProperties,
    ).toBe(true);
  });

  it('keeps a schema for `additionalProperties` and marks the schema open', () => {
    const node = normaliseSchema({ type: 'object', additionalProperties: { type: 'integer' } });
    expect(node?.allowsAdditionalProperties).toBe(true);
    expect(node?.additionalProperties?.types).toEqual(['integer']);
  });

  it('keeps every position of a draft-4 array-form tuple', () => {
    const node = normaliseSchema({
      type: 'array',
      items: [{ type: 'string' }, { type: 'number' }],
    });
    expect(node?.tupleItems?.map((i) => i.types[0])).toEqual(['string', 'number']);
    // The tuple is not a uniformly typed array, so `items` must not claim otherwise.
    expect(node?.items).toBeUndefined();
  });

  it('reads a 2020-12 `prefixItems` tuple with a trailing `items` schema', () => {
    const node = normaliseSchema({
      type: 'array',
      prefixItems: [{ type: 'string' }, { type: 'number' }],
      items: { type: 'boolean' },
    });
    expect(node?.tupleItems?.map((i) => i.types[0])).toEqual(['string', 'number']);
    expect(node?.items?.types).toEqual(['boolean']);
  });

  it('keeps a required key that has no entry in `properties`', () => {
    // Legal, and means "this key must be present, with any value".
    const node = normaliseSchema({ type: 'object', required: ['id'] });
    expect(node?.properties?.map((p) => [p.name, p.required])).toEqual([['id', true]]);
  });

  it('appends undeclared required keys after the declared ones', () => {
    const node = normaliseSchema({
      type: 'object',
      required: ['a', 'ghost'],
      properties: { a: { type: 'string' } },
    });
    expect(node?.properties?.map((p) => p.name)).toEqual(['a', 'ghost']);
    expect(node?.properties?.[1]?.types).toEqual([]);
  });

  it('renders an unresolved $ref as an explicit marker, not an empty schema', () => {
    // What survives when dereferencing fails, e.g. a broken external URL.
    const node = normaliseSchema({ $ref: 'https://example.com/404.yaml#/Pet' });
    expect(node?.unresolvedRef).toBe('https://example.com/404.yaml#/Pet');
    expect(node?.refName).toBe('Pet');
  });

  it('marks an unresolved $ref nested inside a property', () => {
    const node = normaliseSchema({
      type: 'object',
      required: ['pet'],
      properties: { pet: { $ref: '#/components/schemas/Pet' } },
    });
    const pet = node?.properties?.[0];
    expect(pet?.unresolvedRef).toBe('#/components/schemas/Pet');
    expect(pet?.required).toBe(true);
  });

  it('stops at a self-referencing schema instead of recursing forever', () => {
    // The shape json-schema-ref-parser produces for a recursive $ref: a cyclic object.
    const node: Record<string, unknown> = { type: 'object', properties: {} };
    (node.properties as Record<string, unknown>).self = node;

    const result = normaliseSchema(node, { names: new Map([[node, 'Node']]) });

    const self = result?.properties?.[0];
    expect(self?.name).toBe('self');
    expect(self?.circularRef).toBe('Node');
    expect(self?.properties).toBeUndefined();
  });

  it('stops at mutual recursion between two schemas', () => {
    const a: Record<string, unknown> = { type: 'object', properties: {} };
    const b: Record<string, unknown> = { type: 'object', properties: { a } };
    (a.properties as Record<string, unknown>).b = b;

    const result = normaliseSchema(a, {
      names: new Map([
        [a, 'A'],
        [b, 'B'],
      ]),
    });
    expect(result?.properties?.[0]?.properties?.[0]?.circularRef).toBe('A');
  });

  it('gives up past maxDepth so a pathological spec cannot hang the renderer', () => {
    let deep: Record<string, unknown> = { type: 'string' };
    for (let i = 0; i < 30; i += 1) deep = { type: 'object', properties: { next: deep } };

    const result = normaliseSchema(deep, { maxDepth: 3 });
    let node = result;
    let depth = 0;
    while (node?.properties?.[0] && !node.properties[0].circularRef) {
      node = node.properties[0];
      depth += 1;
    }
    expect(depth).toBeLessThanOrEqual(3);
  });

  it('handles the boolean schemas `true` and `false`', () => {
    expect(normaliseSchema(true)?.types).toEqual([]);
    expect(normaliseSchema(false)?.types).toEqual(['never']);
  });
});

describe('schemaTypeLabel', () => {
  it('names a component by its ref name', () => {
    expect(schemaTypeLabel({ types: ['object'], refName: 'Pet' })).toBe('Pet');
  });

  it('renders an array of refs with bracket notation', () => {
    expect(
      schemaTypeLabel({ types: ['array'], items: { types: ['object'], refName: 'Pet' } }),
    ).toBe('Pet[]');
  });

  it('joins a union of types', () => {
    expect(schemaTypeLabel({ types: ['string', 'null'] })).toBe('string | null');
  });

  it('parenthesises a union inside an array so it cannot be misread', () => {
    expect(schemaTypeLabel({ types: ['array'], items: { types: ['string', 'null'] } })).toBe(
      '(string | null)[]',
    );
  });

  it('keeps nullability when an array is part of a union', () => {
    // `type: ['array', 'null']` is common in OpenAPI 3.1; labelling it `string[]` overstates
    // what the endpoint accepts.
    expect(schemaTypeLabel({ types: ['array', 'null'], items: { types: ['string'] } })).toBe(
      'string[] | null',
    );
  });

  it('keeps nullability on a tuple in a union', () => {
    expect(schemaTypeLabel({ types: ['array', 'null'], tupleItems: [{ types: ['string'] }] })).toBe(
      '[string] | null',
    );
  });

  it('renders a tuple positionally', () => {
    expect(
      schemaTypeLabel({
        types: ['array'],
        tupleItems: [{ types: ['string'] }, { types: ['number'] }],
      }),
    ).toBe('[string, number]');
  });

  it('names the first composition keyword when there is no concrete type', () => {
    expect(schemaTypeLabel({ types: [], compositions: [{ kind: 'oneOf', options: [] }] })).toBe(
      'oneOf',
    );
  });

  it('falls back to `any` for an empty schema', () => {
    expect(schemaTypeLabel(undefined)).toBe('any');
    expect(schemaTypeLabel({ types: [] })).toBe('any');
  });
});
