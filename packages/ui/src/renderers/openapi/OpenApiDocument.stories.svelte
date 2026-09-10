<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NavItem from '../../molecules/NavItem.svelte';
  import DocLayout from '../../templates/DocLayout.svelte';
  import OpenApiDocument from './OpenApiDocument.svelte';
  import { PETSTORE_DOCUMENT } from './petstore.fixture.js';

  const { Story } = defineMeta({
    title: 'Renderers/OpenAPI/Petstore',
    component: OpenApiDocument,
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component:
            'The complete Petstore document through the same renderer used by the viewer, static site and VS Code webview.',
        },
      },
    },
  });
</script>

<Story name="Complete document">
  <DocLayout>
    {#snippet sidebar()}
      <strong class="brand">Petstore</strong>
      <nav class="nav" aria-label="Petstore sections">
        {#each PETSTORE_DOCUMENT.nav as group (group.id)}
          <NavItem href="#{group.id}" label={group.label} />
          {#each group.children ?? [] as item (item.id)}
            <NavItem
              href="#{item.id}"
              label={item.label}
              badge={item.badge}
              badgeTone={item.badgeKind === 'delete' ? 'delete' : item.badgeKind === 'post' ? 'post' : 'get'}
              deprecated={item.deprecated}
              depth={1}
            />
          {/each}
        {/each}
      </nav>
    {/snippet}

    <OpenApiDocument document={PETSTORE_DOCUMENT} />

    {#snippet rightRail()}
      <nav class="rail" aria-label="On this page">
        <a href="#tag-pets">pets</a>
        <a href="#tag-store">store</a>
        <a href="#schemas">Schemas</a>
      </nav>
    {/snippet}
  </DocLayout>
</Story>

<style>
  .brand {
    display: block;
    margin-bottom: var(--apibox-space-4);
    font-size: var(--apibox-font-size-lg);
  }

  .nav,
  .rail {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-1);
  }

  .rail a {
    padding: var(--apibox-space-1) 0;
    color: var(--apibox-fg-muted);
    text-decoration: none;
  }

  .rail a:hover {
    color: var(--apibox-accent);
  }
</style>
