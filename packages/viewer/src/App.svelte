<script lang="ts">
  import { AsyncApiDocument, DocLayout, JsonRpcDocument, NavItem, OpenApiDocument, SearchInput } from '@apibox/ui';
  import { onMount } from 'svelte';
  import type { DataSource } from './data-source.js';
  import { filterNavigation } from './nav.js';
  import type { ViewerNavigation } from './navigation.js';
  import SidebarNav from './SidebarNav.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import { createViewerSession } from './viewer-session.svelte.js';

  interface Props {
    dataSource: DataSource;
    navigation: ViewerNavigation;
    webview?: boolean;
  }

  const { dataSource, navigation, webview = false }: Props = $props();
  const session = createViewerSession(() => dataSource);

  const filteredNavigation = $derived(
    session.currentDocument
      ? filterNavigation(session.currentDocument.nav, session.query)
      : [],
  );
  const ready = $derived(
    session.manifest && session.currentDocument
      ? { manifest: session.manifest, document: session.currentDocument }
      : undefined,
  );

  onMount(() => {
    const sectionTracker = navigation.createSectionTracker((sectionId) => {
      session.currentSection = sectionId;
    });
    const stopSession = session.start(navigation.router, {
      documentLoaded(apiDocument, sectionId) {
        sectionTracker.observe(apiDocument);
        sectionTracker.scrollTo(sectionId);
      },
      sectionRequested(sectionId) {
        sectionTracker.scrollTo(sectionId);
      },
    });

    return () => {
      stopSession();
      sectionTracker.dispose();
    };
  });
</script>

{#if !webview}
  <ThemeToggle />
{/if}

{#if session.loading}
  <main class="state" aria-live="polite" data-testid="viewer-loading">Loading documentation…</main>
{:else if session.error}
  <main class="state error" role="alert" data-testid="viewer-error">{session.error}</main>
{:else if ready}
  <DocLayout testId="viewer-layout">
    {#snippet sidebar()}
      <div class="sidebar-content" data-testid="viewer-sidebar">
        <a
          class="brand"
          href={navigation.router.href({ documentId: ready.document.id })}
          data-testid="viewer-home">apibox</a
        >
        {#if ready.manifest.documents.length > 1}
          <nav class="documents" aria-label="API documents" data-testid="viewer-documents">
            {#each ready.manifest.documents as entry (entry.id)}
              <NavItem
                href={navigation.router.href({ documentId: entry.id })}
                label={entry.title}
                current={entry.id === ready.document.id}
                testId="viewer-document-{entry.id}"
              />
            {/each}
          </nav>
        {/if}
        <SearchInput
          value={session.query}
          onchange={(value) => (session.query = value)}
          testId="viewer-search"
        />
        <nav aria-label="Document sections" data-testid="viewer-sections">
          <SidebarNav
            nodes={filteredNavigation}
            hrefFor={(sectionId) =>
              navigation.router.href({ documentId: ready.document.id, sectionId })}
            currentSection={session.currentSection}
          />
        </nav>
      </div>
    {/snippet}

    {#if ready.document.kind === 'openapi'}
      <OpenApiDocument document={ready.document} />
    {:else if ready.document.kind === 'asyncapi'}
      <AsyncApiDocument document={ready.document} />
    {:else}
      <JsonRpcDocument document={ready.document} />
    {/if}

    {#snippet rightRail()}
      <nav class="on-page" aria-label="On this page" data-testid="viewer-on-page">
        {#each ready.document.nav as node (node.id)}
          <NavItem
            href={navigation.router.href({ documentId: ready.document.id, sectionId: node.id })}
            label={node.label}
            current={session.currentSection === node.id}
            testId="viewer-on-page-{node.id}"
          />
        {/each}
      </nav>
    {/snippet}
  </DocLayout>
{/if}

<style>
  .state {
    display: grid;
    min-height: 100vh;
    padding: var(--apibox-space-6);
    place-items: center;
    font-family: var(--apibox-font);
    color: var(--apibox-fg-muted);
    background: var(--apibox-bg);
  }

  .error {
    color: var(--apibox-danger);
  }

  .sidebar-content,
  .documents,
  .on-page {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  .brand {
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size-heading);
    font-weight: var(--apibox-font-weight-bold);
    color: var(--apibox-fg);
    text-decoration: none;
  }

  .documents {
    padding-bottom: var(--apibox-space-3);
    border-bottom: 1px solid var(--apibox-border);
  }
</style>
