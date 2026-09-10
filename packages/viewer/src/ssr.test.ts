import '@testing-library/jest-dom/vitest';
import { OpenApiDocument } from '@apibox/ui';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { hydrate, tick, unmount } from 'svelte';
import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';
import { DOCUMENT } from './test-fixtures.js';

describe('component SSR and hydration', () => {
  it('hydrates the OpenAPI renderer over server-rendered markup', async () => {
    const server = await createServer({
      configFile: false,
      root: process.cwd(),
      plugins: [svelte()],
      server: { hmr: false, middlewareMode: true },
    });
    const serverModule = (await server.ssrLoadModule('@apibox/ui')) as {
      OpenApiDocument: typeof OpenApiDocument;
    };
    const serverSvelte = (await server.ssrLoadModule('svelte/server')) as {
      render: (
        component: typeof OpenApiDocument,
        options: { props: { document: typeof DOCUMENT } },
      ) => { body: string };
    };
    const rendered = serverSvelte.render(serverModule.OpenApiDocument, {
      props: { document: DOCUMENT },
    });
    await server.close();
    const target = document.createElement('div');
    target.innerHTML = rendered.body;
    document.body.append(target);

    const component = hydrate(OpenApiDocument, { target, props: { document: DOCUMENT } });
    await tick();

    expect(target.querySelector('[data-testid="openapi-document"]')).toBeInTheDocument();
    expect(
      target.querySelector('[data-testid="openapi-document-operation-listPets"]'),
    ).toBeInTheDocument();

    await unmount(component);
    target.remove();
  });
});
