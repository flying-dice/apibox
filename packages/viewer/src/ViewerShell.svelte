<script lang="ts">
  import { AsyncApiDocument, DocLayout, JsonRpcDocument, NavItem, OpenApiDocument, SearchInput } from '@apibox/ui';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
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
    sidebarHeader?: Snippet;
    reloadRevision?: number;
  }

  const {
    dataSource,
    navigation,
    webview = false,
    sidebarHeader,
    reloadRevision = 0,
  }: Props = $props();
  const session = createViewerSession(() => dataSource);
  let started = false;
  let previousReloadRevision = 0;

  const filteredNavigation = $derived(
    session.currentDocument
      ? filterNavigation(session.currentDocument.nav, session.query)
      : [],
  );
  const manifest = $derived(session.manifest);
  const currentDocument = $derived(session.currentDocument);
  let sectionTracker: ReturnType<ViewerNavigation['createSectionTracker']> | undefined;
  const events = {
    documentLoaded(apiDocument: NonNullable<typeof session.currentDocument>, sectionId?: string) {
      sectionTracker?.observe(apiDocument);
      sectionTracker?.scrollTo(sectionId);
    },
    sectionRequested(sectionId?: string) {
      sectionTracker?.scrollTo(sectionId);
    },
  };

  function navigateToDocument(documentId: string): void {
    navigation.router.navigate({ documentId });
  }

  function navigateToSection(sectionId: string): void {
    if (!currentDocument) return;
    navigation.router.navigate({ documentId: currentDocument.id, sectionId });
    // A repeated click does not emit hashchange, but should still return to the section.
    sectionTracker?.scrollTo(sectionId);
  }

  function navigateHome(event: MouseEvent): void {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      !currentDocument
    ) {
      return;
    }
    event.preventDefault();
    navigateToDocument(currentDocument.id);
  }

  onMount(() => {
    sectionTracker = navigation.createSectionTracker((sectionId) => {
      session.currentSection = sectionId;
    });
    const stopSession = session.start(navigation.router, events);
    started = true;

    return () => {
      stopSession();
      sectionTracker?.dispose();
    };
  });

  $effect(() => {
    if (started && reloadRevision !== previousReloadRevision) {
      previousReloadRevision = reloadRevision;
      void session.reload(navigation.router.current(), navigation.router, events);
    }
  });
</script>

{#if !webview}
  <ThemeToggle />
{/if}

{#if session.loading}
  <main class="state" aria-live="polite" data-testid="viewer-loading">Loading documentation…</main>
{:else if session.error}
  <main class="state error" role="alert" data-testid="viewer-error">{session.error}</main>
{:else if manifest}
  <DocLayout testId="viewer-layout">
    {#snippet sidebar()}
      <div class="sidebar-content" data-testid="viewer-sidebar">
        <a
          class="brand"
          href={navigation.router.href({ documentId: currentDocument?.id })}
          onclick={navigateHome}
          data-testid="viewer-home">apibox</a
        >
        {#if sidebarHeader}
          {@render sidebarHeader()}
        {/if}
        {#if manifest.documents.length > 0}
          <nav class="documents" aria-label="API documents" data-testid="viewer-documents">
            {#each manifest.documents as entry (entry.id)}
              <NavItem
                href={navigation.router.href({ documentId: entry.id })}
                label={entry.title}
                current={entry.id === currentDocument?.id}
                testId="viewer-document-{entry.id}"
                onnavigate={() => navigateToDocument(entry.id)}
              />
            {/each}
          </nav>
        {/if}
        {#if currentDocument}
          <SearchInput
            value={session.query}
            onchange={(value) => (session.query = value)}
            testId="viewer-search"
          />
          <nav aria-label="Document sections" data-testid="viewer-sections">
            <SidebarNav
              nodes={filteredNavigation}
              hrefFor={(sectionId) =>
                navigation.router.href({ documentId: currentDocument.id, sectionId })}
              currentSection={session.currentSection}
              onnavigate={navigateToSection}
            />
          </nav>
        {/if}
      </div>
    {/snippet}

    {#if currentDocument?.kind === 'openapi'}
      <OpenApiDocument document={currentDocument} />
    {:else if currentDocument?.kind === 'asyncapi'}
      <AsyncApiDocument document={currentDocument} />
    {:else if currentDocument?.kind === 'jsonrpc'}
      <JsonRpcDocument document={currentDocument} />
    {:else}
      <section class="empty-workspace" data-testid="viewer-empty-workspace">
        <span class="empty-kicker" data-testid="viewer-empty-workspace-kicker">Ready when you are</span>
        <h1 data-testid="viewer-empty-workspace-title">Import your first API description</h1>
        <p data-testid="viewer-empty-workspace-description">
          Add OpenAPI, AsyncAPI or OpenRPC files from the workspace controls. Your files stay in
          this browser.
        </p>
      </section>
    {/if}

    {#snippet rightRail()}
      {#if currentDocument}
        <nav class="on-page" aria-label="On this page" data-testid="viewer-on-page">
          {#each currentDocument.nav as node (node.id)}
            <NavItem
              href={navigation.router.href({ documentId: currentDocument.id, sectionId: node.id })}
              label={node.label}
              current={session.currentSection === node.id}
              testId="viewer-on-page-{node.id}"
              onnavigate={() => navigateToSection(node.id)}
            />
          {/each}
        </nav>
      {/if}
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

  .empty-workspace {
    display: grid;
    max-width: 34rem;
    min-height: 60vh;
    align-content: center;
    margin: 0 auto;
    text-align: center;
  }

  .empty-workspace h1 {
    margin: var(--apibox-space-2) 0 var(--apibox-space-3);
    font-size: 2rem;
  }

  .empty-workspace p {
    margin: 0;
    color: var(--apibox-fg-muted);
    line-height: 1.6;
  }

  .empty-kicker {
    color: var(--apibox-accent);
    font-size: var(--apibox-font-size-sm);
    font-weight: var(--apibox-font-weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
