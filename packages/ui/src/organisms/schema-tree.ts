import type { SchemaNode } from '@apibox/core';

/**
 * Tree mechanics for the schema viewer.
 *
 * Kept out of the component so the termination guarantees can be tested directly, without
 * rendering — the interesting cases are cycles and depth, not markup.
 */

/**
 * How deep the viewer will ever render.
 *
 * `@apibox/core` caps normalisation and marks cycles, but `SchemaViewer` is public API and
 * takes any `SchemaNode` — including one built by hand or by a future parser that forgets
 * to mark something. The cap is the backstop that turns a potential stack overflow into a
 * truncated tree with a visible note.
 */
export const MAX_RENDER_DEPTH = 32;

/**
 * How many children a node renders before offering "show the rest".
 *
 * Normalisation limits depth but not width, and a generated model can carry hundreds of
 * properties. Rendering them all at once is what would actually block the UI.
 */
export const CHILD_BUDGET = 60;

export interface ChildNode {
  /**
   * Unique within a parent, and stable for the child it names.
   *
   * Derived from the name so that expansion state follows a property when siblings are
   * reordered rather than staying with a position. Names are not guaranteed unique — a
   * malformed document can repeat one, and duplicate `#each` keys are a runtime error in
   * Svelte — so a counter disambiguates the repeats.
   */
  key: string;
  name?: string;
  schema: SchemaNode;
}

/**
 * The children a node expands into.
 *
 * Composition is presented as alternatives rather than merged: showing a reader "one of
 * these three shapes" is more honest than a synthesised union that appears nowhere in
 * their document.
 */
export function childNodes(schema: SchemaNode): ChildNode[] {
  if (schema.circularRef) return [];

  const children: ChildNode[] = [];
  const childKeyCounts = new Map<string, number>();

  const push = (prefix: string, node: SchemaNode, name?: string) => {
    const base = `${prefix}-${slug(name ?? node.name ?? 'anonymous')}`;
    const seen = childKeyCounts.get(base) ?? 0;
    childKeyCounts.set(base, seen + 1);
    children.push({ key: seen === 0 ? base : `${base}-${seen + 1}`, name, schema: node });
  };

  for (const property of schema.properties ?? []) push('p', property);
  for (const [index, item] of (schema.tupleItems ?? []).entries()) {
    push('t', item, item.name ?? `[${index}]`);
  }
  // `items` and `additionalProperties` are singletons, so the prefix alone is a stable key.
  if (schema.items) children.push({ key: 'items', name: 'items', schema: schema.items });
  if (schema.additionalProperties) {
    children.push({
      key: 'additional',
      name: 'additional properties',
      schema: schema.additionalProperties,
    });
  }
  for (const composition of schema.compositions ?? []) {
    for (const [index, option] of composition.options.entries()) {
      push(composition.kind, option, option.name ?? `${composition.kind} · option ${index + 1}`);
    }
  }

  return children;
}

/** A key fragment: safe in a `data-testid` and in a CSS selector. */
function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'anonymous';
}

/**
 * Why a branch stops, or `undefined` if it may be expanded.
 *
 * Three independent stopping conditions, because relying on any one of them alone has been
 * a source of hangs: the parser's own cycle marker, ancestry by object identity for cycles
 * it missed, and a hard depth cap for everything else.
 */
export type StopReason =
  | { kind: 'marked'; ref: string }
  | { kind: 'cycle' }
  | { kind: 'depth'; limit: number };

export function stopReason(
  schema: SchemaNode,
  ancestors: readonly SchemaNode[],
  depth: number,
): StopReason | undefined {
  if (schema.circularRef) return { kind: 'marked', ref: schema.circularRef };
  // Identity, not equality: a dereferenced cycle is the same object appearing again.
  if (ancestors.includes(schema)) return { kind: 'cycle' };
  if (depth >= MAX_RENDER_DEPTH) return { kind: 'depth', limit: MAX_RENDER_DEPTH };
  return undefined;
}

/**
 * The depth of the deepest branch, so "expand all" can mean all of it.
 *
 * Cycle-safe and capped, so this terminates on the same inputs the renderer survives.
 */
export function treeDepth(
  schema: SchemaNode,
  ancestors: readonly SchemaNode[] = [],
  depth = 0,
): number {
  if (stopReason(schema, ancestors, depth)) return depth;

  const children = childNodes(schema);
  if (children.length === 0) return depth;

  const nextAncestors = [...ancestors, schema];
  let deepest = depth;
  for (const child of children) {
    deepest = Math.max(deepest, treeDepth(child.schema, nextAncestors, depth + 1));
  }
  return deepest;
}
