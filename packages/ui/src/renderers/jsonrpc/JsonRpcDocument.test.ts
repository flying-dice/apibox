import type { JsonRpcDocument as JsonRpcDocumentModel, RpcMethod } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import JsonRpcDocument from './JsonRpcDocument.svelte';

function method(overrides: Partial<RpcMethod> = {}): RpcMethod {
  return {
    id: overrides.id ?? 'getBalance',
    name: overrides.name ?? 'getBalance',
    deprecated: false,
    tags: overrides.tags ?? ['accounts'],
    paramStructure: 'either',
    params: [],
    errors: [],
    examples: [],
    links: [],
    ...overrides,
  };
}

function document(overrides: Partial<JsonRpcDocumentModel> = {}): JsonRpcDocumentModel {
  const methods = overrides.methods ?? [method()];
  return {
    id: 'wallet',
    kind: 'jsonrpc',
    title: 'Wallet',
    version: '1.0.0',
    specVersion: '1.3.2',
    servers: [],
    tags: [],
    schemas: [],
    contentDescriptors: [],
    tagCatalog: [],
    exampleCatalog: [],
    examplePairingCatalog: [],
    linkCatalog: [],
    warnings: [],
    nav: [
      {
        id: 'tag-accounts',
        label: 'accounts',
        children: methods.map((m) => ({ id: m.id, label: m.name })),
      },
    ],
    methods,
    ...overrides,
  };
}

describe('JsonRpcDocument', () => {
  it("renders a tag's description and external docs above its group section", () => {
    render(JsonRpcDocument, {
      document: document({
        tags: [
          {
            name: 'accounts',
            description: 'Methods for managing wallet accounts.',
            externalDocs: { url: 'https://example.com/accounts', description: 'Accounts guide' },
          },
        ],
      }),
    });

    expect(screen.getByTestId('jsonrpc-document-tag-accounts-description')).toHaveTextContent(
      'Methods for managing wallet accounts.',
    );
    expect(screen.getByTestId('jsonrpc-document-tag-accounts-external-docs-link')).toHaveAttribute(
      'href',
      'https://example.com/accounts',
    );
    expect(
      screen.getByTestId('jsonrpc-document-tag-accounts-external-docs-link'),
    ).toHaveTextContent('Accounts guide');
  });

  it("renders a tag's own x-* extensions as chips above its group section", () => {
    render(JsonRpcDocument, {
      document: document({
        tags: [{ name: 'accounts', extensions: [{ key: 'x-tag-color', value: 'blue' }] }],
      }),
    });

    expect(
      screen.getByTestId('jsonrpc-document-tag-accounts-extension-x-tag-color'),
    ).toHaveTextContent('blue');
  });

  it('renders no description/external-docs scaffolding for a tag that carries neither', () => {
    render(JsonRpcDocument, { document: document({ tags: [{ name: 'accounts' }] }) });

    expect(
      screen.queryByTestId('jsonrpc-document-tag-accounts-description'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('jsonrpc-document-tag-accounts-external-docs'),
    ).not.toBeInTheDocument();
    // The group heading itself is unaffected -- still there, still bare.
    expect(screen.getByTestId('jsonrpc-document-tag-accounts-title')).toHaveTextContent('accounts');
  });

  it('omits every component catalogue section when the document declares no matching component map', () => {
    render(JsonRpcDocument, { document: document() });

    expect(screen.queryByTestId('jsonrpc-document-tag-catalog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('jsonrpc-document-example-catalog')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('jsonrpc-document-example-pairing-catalog'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('jsonrpc-document-link-catalog')).not.toBeInTheDocument();
  });

  it('renders every component catalogue when the document declares one, reachable independent of any method', () => {
    render(JsonRpcDocument, {
      document: document({
        tagCatalog: [{ name: 'archived', description: 'No longer used by any method.' }],
        exampleCatalog: [{ name: 'ZeroBalance', value: '0' }],
        examplePairingCatalog: [{ name: 'Pair', params: [], result: '0' }],
        linkCatalog: [{ name: 'RetryGetBalance', method: 'getBalance' }],
      }),
    });

    expect(screen.getByTestId('jsonrpc-document-tag-catalog-0-name')).toHaveTextContent('archived');
    expect(screen.getByTestId('jsonrpc-document-example-catalog-0-name')).toHaveTextContent(
      'ZeroBalance',
    );
    expect(screen.getByTestId('jsonrpc-document-example-pairing-catalog-0-name')).toHaveTextContent(
      'Pair',
    );
    expect(screen.getByTestId('jsonrpc-document-link-catalog-0-name')).toHaveTextContent(
      'RetryGetBalance',
    );
  });
});
