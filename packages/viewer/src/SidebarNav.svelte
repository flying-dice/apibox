<script lang="ts">
  import type { NavNode } from '@apibox/core';
  import { badgeTone, NavItem } from '@apibox/ui';
  import SidebarNav from './SidebarNav.svelte';

  interface Props {
    nodes: readonly NavNode[];
    hrefFor: (sectionId: string) => string;
    currentSection?: string;
    depth?: number;
    testId?: string;
  }

  const {
    nodes,
    hrefFor,
    currentSection,
    depth = 0,
    testId = 'viewer-nav',
  }: Props = $props();

</script>

<div class="nodes" data-testid="{testId}-group-{depth}-{nodes[0]?.id ?? 'empty'}">
  {#each nodes as node (node.id)}
    <NavItem
      href={hrefFor(node.id)}
      label={node.label}
      badge={node.badge}
      badgeTone={badgeTone(node.badgeKind)}
      current={currentSection === node.id}
      deprecated={node.deprecated}
      {depth}
      testId="{testId}-{node.id}"
    />
    {#if node.children?.length}
      <SidebarNav
        nodes={node.children}
        {hrefFor}
        {currentSection}
        depth={depth + 1}
        {testId}
      />
    {/if}
  {/each}
</div>

<style>
  .nodes {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-1);
  }
</style>
