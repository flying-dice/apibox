import type { ApiDocument } from '@apibox/core';
import { tick } from 'svelte';
import type { DataSource, DocumentManifest } from './data-source.js';
import type { HashRouter, ViewerRoute } from './router.js';

interface SessionEvents {
  documentLoaded(document: ApiDocument, sectionId?: string): void;
  sectionRequested(sectionId?: string): void;
}

export function createViewerSession(getDataSource: () => DataSource) {
  const dataSource = $derived(getDataSource());
  let manifest = $state.raw<DocumentManifest>();
  let currentDocument = $state.raw<ApiDocument>();
  let currentSection = $state<string>();
  let query = $state('');
  let loading = $state(true);
  let error = $state<string>();
  let documentLoadGeneration = 0;

  function resolveDocumentId(route: ViewerRoute): string | undefined {
    const requestedEntry = manifest?.documents.find((entry) => entry.id === route.documentId);
    return requestedEntry?.id ?? manifest?.documents[0]?.id;
  }

  function canonicalRoute(route: ViewerRoute, router: HashRouter): ViewerRoute | undefined {
    const documentId = resolveDocumentId(route);
    if (!documentId) return undefined;
    const resolvedRoute = { documentId, sectionId: route.sectionId };
    if (route.documentId !== documentId) router.navigate(resolvedRoute, true);
    return resolvedRoute;
  }

  async function loadDocument(
    documentId: string,
    sectionId: string | undefined,
    events: SessionEvents,
  ): Promise<void> {
    const loadGeneration = ++documentLoadGeneration;
    loading = true;
    error = undefined;
    try {
      const loadedDocument = await dataSource.loadDocument(documentId);
      if (loadGeneration !== documentLoadGeneration) return;
      currentDocument = loadedDocument;
      currentSection = sectionId;
      query = '';
      loading = false;
      await tick();
      events.documentLoaded(loadedDocument, sectionId);
    } catch (cause) {
      if (loadGeneration !== documentLoadGeneration) return;
      error = cause instanceof Error ? cause.message : 'The document could not be loaded.';
      loading = false;
    }
  }

  async function applyRoute(
    route: ViewerRoute,
    router: HashRouter,
    events: SessionEvents,
  ): Promise<void> {
    if (!manifest) return;
    const resolvedRoute = canonicalRoute(route, router);
    if (!resolvedRoute?.documentId) return;
    if (currentDocument?.id !== resolvedRoute.documentId) {
      await loadDocument(resolvedRoute.documentId, resolvedRoute.sectionId, events);
    } else {
      currentSection = resolvedRoute.sectionId;
      events.sectionRequested(resolvedRoute.sectionId);
    }
  }

  async function initialise(
    route: ViewerRoute,
    router: HashRouter,
    events: SessionEvents,
  ): Promise<void> {
    loading = true;
    error = undefined;
    try {
      manifest = await dataSource.loadManifest();
      const resolvedRoute = canonicalRoute(route, router);
      if (!resolvedRoute?.documentId) throw new Error('No API documents are available.');
      await loadDocument(resolvedRoute.documentId, resolvedRoute.sectionId, events);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The documentation could not be loaded.';
      loading = false;
    }
  }

  function start(router: HashRouter, events: SessionEvents): () => void {
    const unsubscribe = router.subscribe((route) => void applyRoute(route, router, events));
    void initialise(router.current(), router, events);
    return () => {
      unsubscribe();
      dataSource.dispose?.();
    };
  }

  return {
    get manifest() {
      return manifest;
    },
    get currentDocument() {
      return currentDocument;
    },
    get currentSection() {
      return currentSection;
    },
    set currentSection(value: string | undefined) {
      currentSection = value;
    },
    get query() {
      return query;
    },
    set query(value: string) {
      query = value;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    start,
  };
}
