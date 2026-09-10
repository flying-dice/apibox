/**
 * Keeps an index selection attached to the exact collection it was made for.
 * Replacing a request/response payload therefore resets its tabs to the first item.
 */
export function createIndexedSelection<T>(items: () => readonly T[]) {
  let selectedCollection = $state.raw<readonly T[] | undefined>();
  let requestedIndex = $state(0);

  const index = $derived.by(() => {
    const collection = items();
    const selectedIndex = selectedCollection === collection ? requestedIndex : 0;
    return Math.min(selectedIndex, Math.max(0, collection.length - 1));
  });

  function select(tabId: string): void {
    const collection = items();
    const indexToSelect = Number.parseInt(tabId, 10);
    if (
      Number.isInteger(indexToSelect) &&
      indexToSelect >= 0 &&
      indexToSelect < collection.length
    ) {
      selectedCollection = collection;
      requestedIndex = indexToSelect;
    }
  }

  return {
    get index(): number {
      return index;
    },
    select,
  };
}
