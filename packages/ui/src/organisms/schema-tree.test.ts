import type { SchemaNode } from '@apibox/core';
import { describe, expect, it } from 'vitest';
import {
  CHILD_BUDGET,
  childNodes,
  MAX_RENDER_DEPTH,
  stopReason,
  treeDepth,
} from './schema-tree.js';

/**
 * Termination is the property that matters here. The renderer is public API and takes any
 * `SchemaNode`, including one built by hand or by a parser that failed to mark a cycle, so
 * these cases are about what happens when the input is hostile rather than typical.
 */

/** A cyclic graph with no `circularRef` marker — what a buggy parser would produce. */
function unmarkedCycle(): SchemaNode {
  const node: SchemaNode = { name: 'Node', types: ['object'], properties: [] };
  node.properties = [{ name: 'self', types: ['object'], properties: [] }];
  // The child *is* the parent: identity, not a copy.
  node.properties[0] = node;
  return node;
}

describe('stopReason', () => {
  it('stops at a marked recursive reference', () => {
    const schema: SchemaNode = { types: ['object'], circularRef: 'Pet' };
    expect(stopReason(schema, [], 0)).toEqual({ kind: 'marked', ref: 'Pet' });
  });

  it('stops at an unmarked cycle, by object identity', () => {
    // The backstop for a cycle the parser missed. Equality would not do: two structurally
    // identical siblings are not a cycle.
    const node = unmarkedCycle();
    expect(stopReason(node, [node], 1)).toEqual({ kind: 'cycle' });
  });

  it('does not mistake two structurally identical siblings for a cycle', () => {
    const a: SchemaNode = { name: 'x', types: ['string'] };
    const b: SchemaNode = { name: 'x', types: ['string'] };
    expect(stopReason(b, [a], 1)).toBeUndefined();
  });

  it('stops at the depth cap', () => {
    expect(stopReason({ types: ['object'] }, [], MAX_RENDER_DEPTH)).toEqual({
      kind: 'depth',
      limit: MAX_RENDER_DEPTH,
    });
    expect(stopReason({ types: ['object'] }, [], MAX_RENDER_DEPTH - 1)).toBeUndefined();
  });
});

describe('treeDepth', () => {
  it('terminates on an unmarked cycle rather than hanging', () => {
    // Without identity tracking this call never returns.
    expect(treeDepth(unmarkedCycle())).toBeLessThanOrEqual(MAX_RENDER_DEPTH);
  });

  it('terminates on a cycle through composition', () => {
    // Composition is a child edge like any other, and an easy one to forget.
    const node: SchemaNode = { name: 'Either', types: [] };
    node.compositions = [{ kind: 'oneOf', options: [node] }];
    expect(treeDepth(node)).toBeLessThanOrEqual(MAX_RENDER_DEPTH);
  });

  it('terminates on a cycle through array items', () => {
    const node: SchemaNode = { name: 'List', types: ['array'] };
    node.items = node;
    expect(treeDepth(node)).toBeLessThanOrEqual(MAX_RENDER_DEPTH);
  });

  it('measures a finite tree exactly, so expand-all can show all of it', () => {
    const leaf: SchemaNode = { name: 'leaf', types: ['string'] };
    const mid: SchemaNode = { name: 'mid', types: ['object'], properties: [leaf] };
    const root: SchemaNode = { name: 'root', types: ['object'], properties: [mid] };

    expect(treeDepth(leaf)).toBe(0);
    expect(treeDepth(root)).toBe(2);
  });

  it('caps a legitimately very deep tree', () => {
    let node: SchemaNode = { name: 'leaf', types: ['string'] };
    for (let i = 0; i < 100; i += 1) {
      node = { name: `level-${i}`, types: ['object'], properties: [node] };
    }
    expect(treeDepth(node)).toBe(MAX_RENDER_DEPTH);
  });
});

describe('childNodes', () => {
  it('covers every way a schema can have children', () => {
    const schema: SchemaNode = {
      types: ['object'],
      properties: [{ name: 'a', types: ['string'] }],
      tupleItems: [{ types: ['number'] }],
      items: { types: ['boolean'] },
      additionalProperties: { types: ['string'] },
      compositions: [{ kind: 'oneOf', options: [{ name: 'opt', types: ['null'] }] }],
    };

    expect(childNodes(schema).map((child) => child.key)).toEqual([
      'p-a',
      't-0',
      'items',
      'additional',
      'oneOf-opt',
    ]);
  });

  it('gives duplicate property names distinct keys', () => {
    // A malformed document can repeat a name, and duplicate `#each` keys are a runtime
    // error in Svelte — it would take the whole view down, not just the row.
    const schema: SchemaNode = {
      types: ['object'],
      properties: [
        { name: 'id', types: ['string'] },
        { name: 'id', types: ['integer'] },
      ],
    };

    const keys = childNodes(schema).map((child) => child.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keys by name, so expansion follows a property when siblings are reordered', () => {
    const a: SchemaNode = { name: 'alpha', types: ['string'] };
    const b: SchemaNode = { name: 'beta', types: ['string'] };

    const before = childNodes({ types: ['object'], properties: [a, b] });
    const after = childNodes({ types: ['object'], properties: [b, a] });

    expect(before[0]?.key).toBe(after[1]?.key);
    expect(before[1]?.key).toBe(after[0]?.key);
  });

  it('gives an anonymous child a usable key', () => {
    const keys = childNodes({
      types: ['object'],
      properties: [{ types: ['string'] }, { types: ['string'] }],
    }).map((child) => child.key);

    expect(new Set(keys).size).toBe(2);
    expect(keys[0]).toMatch(/anonymous/);
  });

  it('returns nothing for a marked recursive node', () => {
    expect(
      childNodes({ types: ['object'], circularRef: 'Pet', properties: [{ name: 'x', types: [] }] }),
    ).toEqual([]);
  });

  it('has a child budget below which width is never truncated', () => {
    expect(CHILD_BUDGET).toBeGreaterThan(20);
  });

  it('expands the new applicator keywords into their own branches', () => {
    const schema: SchemaNode = {
      types: ['object'],
      conditional: {
        if: { types: ['string'] },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema keyword, not a thenable.
        then: { types: ['string'], name: 'zip' },
        else: { types: ['string'], name: 'postalCode' },
      },
      patternProperties: [{ pattern: '^S_', schema: { types: ['string'] } }],
      propertyNames: { types: ['string'] },
      contains: { types: ['integer'] },
      dependentSchemas: [{ property: 'creditCard', schema: { types: ['object'] } }],
      unevaluatedProperties: { types: ['string'] },
      unevaluatedItems: { types: ['boolean'] },
    };

    expect(childNodes(schema).map((child) => child.key)).toEqual([
      'if-if',
      'then-zip',
      'else-postalCode',
      'pattern-properties-pattern-S',
      'property-names',
      'contains',
      'dependent-schemas-if-creditCard-is-present',
      'unevaluated-properties',
      'unevaluated-items',
    ]);
  });

  it('does not expand unevaluatedProperties/unevaluatedItems when they are only a boolean flag', () => {
    // The boolean form is open/closed, not a schema — there is nothing to descend into.
    expect(childNodes({ types: ['object'], allowsUnevaluatedProperties: false })).toEqual([]);
  });
});
