import type { ApiDocument } from '@apibox/core';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';
import type { DataSource } from './data-source.js';
import { filterNavigation } from './nav.js';
import { createBrowserNavigation } from './navigation.js';
import { createHashRouter, formatHash, parseHash } from './router.js';
import { StaticDataSource } from './static-data-source.js';
import { DOCUMENT, MANIFEST } from './test-fixtures.js';
import { WebviewDataSource } from './webview-data-source.js';

afterEach(() => {
  window.history.replaceState(null, '', '#/');
});

describe('hash routing', () => {
  it('round-trips encoded document and section identifiers', () => {
    const hash = formatHash('pet store', 'tag/pets');
    expect(hash).toBe('#/pet%20store/tag%2Fpets');
    expect(parseHash(hash)).toEqual({ documentId: 'pet store', sectionId: 'tag/pets' });
  });

  it('replaces malformed UTF-16 without throwing', () => {
    expect(formatHash('broken\uD800id')).toBe('#/broken%EF%BF%BDid');
  });

  it('notifies subscribers and supports history-safe replacement', () => {
    const router = createHashRouter(window);
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);

    router.navigate({ documentId: 'petstore', sectionId: 'listPets' }, true);
    expect(router.current()).toEqual({ documentId: 'petstore', sectionId: 'listPets' });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('navigation filtering', () => {
  it('retains ancestors of matching operations', () => {
    expect(filterNavigation(DOCUMENT.nav, 'POST')).toEqual([
      {
        id: 'tag-pets',
        label: 'Pets',
        children: [{ id: 'createPet', label: 'Create pet', badge: 'POST', children: [] }],
      },
    ]);
  });

  it('contains cyclic navigation supplied by a host', () => {
    const cyclic = { id: 'cycle', label: 'Cycle', children: [] };
    cyclic.children.push(cyclic as never);
    expect(filterNavigation([cyclic], 'missing')).toEqual([]);
  });
});

describe('StaticDataSource', () => {
  it('loads the manifest once and follows its document file mapping', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(MANIFEST)))
      .mockResolvedValueOnce(new Response(JSON.stringify(DOCUMENT)));
    const source = new StaticDataSource('/docs/', fetcher);

    await expect(source.loadManifest()).resolves.toEqual(MANIFEST);
    await expect(source.loadDocument('petstore')).resolves.toEqual(DOCUMENT);
    await source.loadManifest();

    expect(fetcher).toHaveBeenNthCalledWith(1, '/docs/data/manifest.json');
    expect(fetcher).toHaveBeenNthCalledWith(2, '/docs/data/petstore.json');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown document identifiers before fetching', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(MANIFEST)));
    const source = new StaticDataSource('.', fetcher);
    await expect(source.loadDocument('missing')).rejects.toThrow('not listed');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects incompatible manifests', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ...MANIFEST, schemaVersion: 2 })));
    await expect(new StaticDataSource('.', fetcher).loadManifest()).rejects.toThrow(
      'unsupported schema version',
    );
  });
});

describe('WebviewDataSource', () => {
  it('requests data from the extension host and caches replies', async () => {
    const postMessage = vi.fn();
    const source = new WebviewDataSource({ postMessage }, window);
    const manifestPromise = source.loadManifest();
    expect(postMessage).toHaveBeenCalledWith({ type: 'apibox/loadManifest' });
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'apibox/manifest', manifest: MANIFEST } }),
    );
    await expect(manifestPromise).resolves.toEqual(MANIFEST);

    const documentPromise = source.loadDocument('petstore');
    expect(postMessage).toHaveBeenCalledWith({
      type: 'apibox/loadDocument',
      documentId: 'petstore',
    });
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'apibox/document', documentId: 'petstore', document: DOCUMENT },
      }),
    );
    await expect(documentPromise).resolves.toEqual(DOCUMENT);
    await source.loadDocument('petstore');
    expect(postMessage).toHaveBeenCalledTimes(2);
    source.dispose();
  });

  it('rejects a document reply that does not match its requested ID', async () => {
    const source = new WebviewDataSource({ postMessage: vi.fn() }, window);
    const documentPromise = source.loadDocument('other');
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'apibox/document', documentId: 'other', document: DOCUMENT },
      }),
    );
    await expect(documentPromise).rejects.toThrow('invalid API document');
    source.dispose();
  });

  it('ignores unrelated messages and rejects malformed manifest replies', async () => {
    const source = new WebviewDataSource({ postMessage: vi.fn() }, window);
    const manifestPromise = source.loadManifest();
    window.dispatchEvent(new MessageEvent('message', { data: null }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'unrelated' } }));
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'apibox/manifest', manifest: { schemaVersion: 99 } },
      }),
    );
    await expect(manifestPromise).rejects.toThrow('invalid site manifest');
    source.dispose();
  });
});

describe('viewer shell', () => {
  it('loads a document and filters its shared navigation', async () => {
    const dataSource: DataSource = {
      loadManifest: async () => MANIFEST,
      loadDocument: async (): Promise<ApiDocument> => DOCUMENT,
    };
    render(App, { dataSource, navigation: createBrowserNavigation(window) });

    expect(await screen.findByTestId('openapi-document')).toBeInTheDocument();
    expect(screen.getByTestId('viewer-nav-listPets')).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('viewer-search-input'), 'POST');
    expect(screen.queryByTestId('viewer-nav-listPets')).not.toBeInTheDocument();
    expect(screen.getByTestId('viewer-nav-createPet')).toBeInTheDocument();
  });

  it('surfaces data-source failures without abandoning the shell', async () => {
    const dataSource: DataSource = {
      loadManifest: async () => {
        throw new Error('Manifest unavailable');
      },
      loadDocument: async () => DOCUMENT,
    };
    render(App, { dataSource, navigation: createBrowserNavigation(window) });
    expect(await screen.findByTestId('viewer-error')).toHaveTextContent('Manifest unavailable');
  });

  it('switches the static-site theme on the document root', async () => {
    const dataSource: DataSource = {
      loadManifest: async () => MANIFEST,
      loadDocument: async () => DOCUMENT,
    };
    document.documentElement.dataset.apiboxTheme = 'dark';
    render(App, { dataSource, navigation: createBrowserNavigation(window) });

    await userEvent.click(screen.getByTestId('viewer-theme-toggle'));
    expect(document.documentElement).toHaveAttribute('data-apibox-theme', 'light');
    expect(screen.getByTestId('viewer-theme-toggle')).toHaveTextContent('Dark theme');
  });

  it('tracks the visible section without adding browser history entries', async () => {
    let notify: IntersectionObserverCallback = () => undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const OriginalIntersectionObserver = globalThis.IntersectionObserver;
    class TestIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe = observe;
      disconnect = disconnect;
      takeRecords = () => [];
      unobserve = vi.fn();
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: TestIntersectionObserver,
    });

    const dataSource: DataSource = {
      loadManifest: async () => MANIFEST,
      loadDocument: async () => DOCUMENT,
    };
    render(App, { dataSource, navigation: createBrowserNavigation(window) });
    await screen.findByTestId('openapi-document');
    const operation = document.getElementById('listPets');
    expect(operation).not.toBeNull();

    notify(
      [
        {
          isIntersecting: true,
          target: operation,
          boundingClientRect: { top: 10 },
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );

    await waitFor(() => expect(window.location.hash).toBe('#/petstore/listPets'));
    expect(screen.getByTestId('viewer-nav-listPets')).toHaveAttribute('aria-current', 'true');
    expect(observe).toHaveBeenCalled();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: OriginalIntersectionObserver,
    });
  });
});
