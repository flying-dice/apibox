import type { NavNode } from '@apibox/core';

export function filterNavigation(nodes: readonly NavNode[], query: string): NavNode[] {
  const needle = query.trim().toLocaleLowerCase();
  const result: NavNode[] = [];
  const stack: Array<{
    node: NavNode;
    output: NavNode[];
    children: NavNode[];
    ancestors: Set<NavNode>;
    expanded: boolean;
  }> = nodes
    .slice()
    .reverse()
    .map((node) => ({ node, output: result, children: [], ancestors: new Set(), expanded: false }));
  let visited = 0;

  while (stack.length > 0 && visited < 10_000) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.expanded) {
      const matches =
        needle === '' ||
        `${frame.node.label} ${frame.node.badge ?? ''}`.toLocaleLowerCase().includes(needle);
      if (matches || frame.children.length > 0)
        frame.output.push({ ...frame.node, children: frame.children });
      continue;
    }
    if (frame.ancestors.has(frame.node)) continue;
    visited += 1;
    frame.expanded = true;
    stack.push(frame);
    const ancestors = new Set(frame.ancestors).add(frame.node);
    for (const child of (frame.node.children ?? []).slice().reverse()) {
      stack.push({ node: child, output: frame.children, children: [], ancestors, expanded: false });
    }
  }
  return result;
}

export function navigationIds(nodes: readonly NavNode[]): string[] {
  const ids: string[] = [];
  const stack = nodes.slice().reverse();
  const seen = new Set<NavNode>();
  while (stack.length > 0 && ids.length < 10_000) {
    const node = stack.pop();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    ids.push(node.id);
    for (const child of (node.children ?? []).slice().reverse()) stack.push(child);
  }
  return ids;
}
