import type { NavNode } from '@apibox/core';

export interface NavigationGroup<T> {
  node: NavNode;
  items: T[];
}

/** Join canonical navigation groups to their renderable normalized items. */
export function itemsByNavigation<T extends { id: string }>(
  navigation: readonly NavNode[],
  items: readonly T[],
): NavigationGroup<T>[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return navigation.flatMap((node) => {
    const groupItems = (node.children ?? []).flatMap((child) => {
      const item = itemsById.get(child.id);
      return item ? [item] : [];
    });
    return groupItems.length > 0 ? [{ node, items: groupItems }] : [];
  });
}
