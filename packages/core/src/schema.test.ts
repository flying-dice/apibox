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

  it("does not label a component's own definition with its own name", () => {
    // Regression for the schema catalog printing every entry's name twice: `names` maps a
    // dereferenced object back to its component name so an inlined `$ref` elsewhere can be
    // labelled, but walking the *definition itself* hits the same map entry by identity.
    // Card 27's toolbar summary must fall back to describing the shape (`object`), not echo
    // the heading a caller already renders above it.
    const address = { type: 'object', properties: { city: { type: 'string' } } };
    const names = new Map<object, string>([[address, 'Address']]);
    const node = normaliseSchema(address, { names }, 'Address');
    expect(node?.name).toBe('Address');
    expect(node?.refName).toBeUndefined();
  });

  it('still labels a genuine inlined $ref to a named component', () => {
    // The same identity lookup nested one level down is not self-reference: it is a
    // property whose value, after dereferencing, points at another named schema.
    const address = { type: 'object', properties: { city: { type: 'string' } } };
    const names = new Map<object, string>([[address, 'Address']]);
    const node = normaliseSchema({ type: 'object', properties: { home: address } }, { names });
    expect(node?.properties?.[0]?.refName).toBe('Address');
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

  it('renders a draft-04 boolean exclusiveMinimum/exclusiveMaximum against the bound it qualifies', () => {
    const exclusive = normaliseSchema({
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: true,
      maximum: 100,
      exclusiveMaximum: true,
    });
    expect(exclusive?.constraints).toEqual([
      { label: 'exclusive min', value: '0' },
      { label: 'exclusive max', value: '100' },
    ]);

    // `false` means the bound is inclusive — the ordinary "min"/"max" label, not a bogus
    // "exclusive min: false" chip.
    const inclusive = normaliseSchema({
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: false,
      maximum: 100,
      exclusiveMaximum: false,
    });
    expect(inclusive?.constraints).toEqual([
      { label: 'min', value: '0' },
      { label: 'max', value: '100' },
    ]);
  });

  it('keeps the draft-06+ numeric exclusiveMinimum/exclusiveMaximum as its own chip', () => {
    const node = normaliseSchema({
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: -1,
      maximum: 100,
      exclusiveMaximum: 101,
    });
    expect(node?.constraints).toEqual([
      { label: 'min', value: '0' },
      { label: 'exclusive min', value: '-1' },
      { label: 'max', value: '100' },
      { label: 'exclusive max', value: '101' },
    ]);
  });

  it('omits a draft-04 exclusive flag with no accompanying bound rather than inventing one', () => {
    const node = normaliseSchema({ type: 'integer', exclusiveMinimum: true });
    expect(node?.constraints).toBeUndefined();
  });

  it('preserves if/then/else as a conditional triple rather than resolving a branch', () => {
    const node = normaliseSchema({
      if: { properties: { country: { const: 'US' } } },
      // biome-ignore lint/suspicious/noThenProperty: JSON Schema keyword, not a thenable.
      then: { required: ['zip'] },
      else: { required: ['postalCode'] },
    });
    expect(node?.conditional?.if.properties?.[0]?.name).toBe('country');
    expect(node?.conditional?.then?.properties?.[0]?.name).toBe('zip');
    expect(node?.conditional?.else?.properties?.[0]?.name).toBe('postalCode');
  });

  it('leaves `then`/`else` undefined when the document declared neither', () => {
    const node = normaliseSchema({ if: { type: 'string' } });
    expect(node?.conditional?.then).toBeUndefined();
    expect(node?.conditional?.else).toBeUndefined();
  });

  it('keeps patternProperties keyed by the regex they govern', () => {
    const node = normaliseSchema({
      type: 'object',
      patternProperties: { '^S_': { type: 'string' }, '^I_': { type: 'integer' } },
    });
    expect(node?.patternProperties?.map((p) => [p.pattern, p.schema.types])).toEqual([
      ['^S_', ['string']],
      ['^I_', ['integer']],
    ]);
  });

  it('captures propertyNames as its own schema', () => {
    const node = normaliseSchema({ type: 'object', propertyNames: { pattern: '^[a-z]+$' } });
    expect(node?.propertyNames?.constraints).toEqual([{ label: 'pattern', value: '^[a-z]+$' }]);
  });

  it('captures contains, minContains and maxContains together', () => {
    const node = normaliseSchema({
      type: 'array',
      contains: { type: 'integer' },
      minContains: 1,
      maxContains: 3,
    });
    expect(node?.contains?.types).toEqual(['integer']);
    expect(node?.constraints).toEqual([
      { label: 'min contains', value: '1' },
      { label: 'max contains', value: '3' },
    ]);
  });

  it('records dependentRequired as which property triggers which requirement', () => {
    const node = normaliseSchema({
      type: 'object',
      dependentRequired: { creditCard: ['billingAddress', 'cvv'] },
    });
    expect(node?.dependentRequired).toEqual([
      { property: 'creditCard', requires: ['billingAddress', 'cvv'] },
    ]);
  });

  it('captures dependentSchemas keyed by the property that triggers them', () => {
    const node = normaliseSchema({
      type: 'object',
      dependentSchemas: { creditCard: { required: ['cvv'] } },
    });
    expect(node?.dependentSchemas?.[0]?.property).toBe('creditCard');
    expect(node?.dependentSchemas?.[0]?.schema.properties?.[0]?.name).toBe('cvv');
  });

  it('distinguishes closed, open and schema-typed unevaluatedProperties, like additionalProperties', () => {
    expect(normaliseSchema({ unevaluatedProperties: false })?.allowsUnevaluatedProperties).toBe(
      false,
    );
    expect(normaliseSchema({ unevaluatedProperties: true })?.allowsUnevaluatedProperties).toBe(
      true,
    );
    const typed = normaliseSchema({ unevaluatedProperties: { type: 'string' } });
    expect(typed?.allowsUnevaluatedProperties).toBe(true);
    expect(typed?.unevaluatedProperties?.types).toEqual(['string']);
  });

  it('captures unevaluatedItems the same way', () => {
    const node = normaliseSchema({ unevaluatedItems: { type: 'boolean' } });
    expect(node?.allowsUnevaluatedItems).toBe(true);
    expect(node?.unevaluatedItems?.types).toEqual(['boolean']);
  });

  it('captures x-* extensions verbatim, in declaration order', () => {
    const node = normaliseSchema({
      type: 'string',
      'x-internal-id': 42,
      'x-nullable-legacy': true,
    });
    expect(node?.extensions).toEqual([
      { key: 'x-internal-id', value: 42 },
      { key: 'x-nullable-legacy', value: true },
    ]);
  });

  it('does not treat an ordinary keyword as an extension', () => {
    const node = normaliseSchema({ type: 'string', example: 'x' });
    expect(node?.extensions).toBeUndefined();
  });

  it('reads discriminator propertyName and mapping, resolving $ref targets to component names', () => {
    const cat: Record<string, unknown> = {
      type: 'object',
      properties: { species: { type: 'string' } },
    };
    const dog: Record<string, unknown> = {
      type: 'object',
      properties: { species: { type: 'string' } },
    };
    const names = new Map([
      [cat, 'Cat'],
      [dog, 'Dog'],
    ]);

    const node = normaliseSchema(
      {
        oneOf: [cat, dog],
        discriminator: {
          propertyName: 'species',
          mapping: {
            cat: '#/components/schemas/Cat',
            dog: 'Dog',
            fish: '#/components/schemas/Fish',
          },
        },
      },
      { names },
    );

    expect(node?.discriminator?.propertyName).toBe('species');
    expect(node?.discriminator?.mapping).toEqual([
      { value: 'cat', target: '#/components/schemas/Cat', resolvedName: 'Cat' },
      // A bare component name is also a legal mapping target, not only a $ref pointer.
      { value: 'dog', target: 'Dog', resolvedName: 'Dog' },
      // A target that matches no known component is kept verbatim rather than dropped.
      { value: 'fish', target: '#/components/schemas/Fish', resolvedName: undefined },
    ]);
  });

  it('reads a discriminator with no mapping', () => {
    const node = normaliseSchema({
      oneOf: [{ type: 'object' }, { type: 'object' }],
      discriminator: { propertyName: 'kind' },
    });
    expect(node?.discriminator).toEqual({ propertyName: 'kind', mapping: undefined });
  });

  it('ignores a discriminator with no propertyName', () => {
    const node = normaliseSchema({ oneOf: [{ type: 'string' }], discriminator: {} });
    expect(node?.discriminator).toBeUndefined();
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
