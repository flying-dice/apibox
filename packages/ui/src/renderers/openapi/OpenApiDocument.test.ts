import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ExampleViewer from '../../organisms/ExampleViewer.svelte';
import MediaTypeViewer from '../../organisms/MediaTypeViewer.svelte';
import DocLayoutHarness from '../../test/DocLayoutHarness.svelte';
import OpenApiDocument from './OpenApiDocument.svelte';
import { PETSTORE_DOCUMENT } from './petstore.fixture.js';

describe('OpenApiDocument', () => {
  it('renders the complete normalized Petstore surface', () => {
    render(OpenApiDocument, { document: PETSTORE_DOCUMENT });

    expect(screen.getByTestId('openapi-document-header-title')).toHaveTextContent('Petstore');
    expect(screen.getByTestId('openapi-document-servers-0-url')).toHaveTextContent(
      'https://api.example.com/v1',
    );
    expect(screen.getByTestId('openapi-document-security-0')).toHaveTextContent('apiKey');
    expect(screen.getByTestId('openapi-document-operation-listPets')).toBeInTheDocument();
    expect(
      screen.getByTestId('openapi-document-operation-getInventory-public'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('openapi-document-schemas-0-viewer')).toBeInTheDocument();
  });

  it('renders operation groups in canonical navigation order', () => {
    const operationGroups = PETSTORE_DOCUMENT.nav.filter((node) => node.id !== 'schemas');
    render(OpenApiDocument, {
      document: {
        ...PETSTORE_DOCUMENT,
        nav: [...operationGroups].reverse(),
      },
    });

    const first = screen.getByTestId(`openapi-document-${operationGroups.at(-1)?.id}`);
    const last = screen.getByTestId(`openapi-document-${operationGroups.at(0)?.id}`);
    expect(first.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses canonical unique schema anchors', () => {
    render(OpenApiDocument, {
      document: {
        ...PETSTORE_DOCUMENT,
        schemas: [
          { name: 'Foo Bar', types: ['string'] },
          { name: 'foo-bar', types: ['number'] },
        ],
        nav: [
          ...PETSTORE_DOCUMENT.nav.filter((node) => node.id !== 'schemas'),
          {
            id: 'schemas',
            label: 'Schemas',
            children: [
              { id: 'schema-foo-bar', label: 'Foo Bar' },
              { id: 'schema-foo-bar-2', label: 'foo-bar' },
            ],
          },
        ],
      },
    });

    expect(screen.getByTestId('openapi-document-schemas-0')).toHaveAttribute(
      'id',
      'schema-foo-bar',
    );
    expect(screen.getByTestId('openapi-document-schemas-1')).toHaveAttribute(
      'id',
      'schema-foo-bar-2',
    );
  });

  it('groups parameters by their OpenAPI location', () => {
    render(OpenApiDocument, { document: PETSTORE_DOCUMENT });

    expect(
      screen.getByTestId('openapi-document-operation-listPets-parameters-query-0-name'),
    ).toHaveTextContent('limit');
    expect(
      screen.getByTestId('openapi-document-operation-listPets-parameters-header-0-name'),
    ).toHaveTextContent('X-Request-Id');
    expect(
      screen.getByTestId('openapi-document-operation-getPet-parameters-path-0-name'),
    ).toHaveTextContent('petId');
  });

  it('marks deprecated operations in text and metadata', () => {
    render(OpenApiDocument, { document: PETSTORE_DOCUMENT });
    const method = screen.getByTestId('openapi-document-operation-deletePet-method');
    expect(method).toHaveAttribute('title', 'DELETE (deprecated)');
    expect(screen.getByTestId('openapi-document-operation-deletePet')).toHaveTextContent(
      'deprecated',
    );
  });

  it('switches request media types without leaking the old schema', async () => {
    render(OpenApiDocument, { document: PETSTORE_DOCUMENT });
    const prefix = 'openapi-document-operation-createPet-request-media';

    expect(screen.getByTestId(`${prefix}-tabs-tab-0`)).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByTestId(`${prefix}-tabs-tab-1`));
    expect(screen.getByTestId(`${prefix}-tabs-tab-1`)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId(`${prefix}-schema`)).toBeInTheDocument();
  });

  it('switches named response examples', async () => {
    render(OpenApiDocument, { document: PETSTORE_DOCUMENT });
    const prefix = 'openapi-document-operation-listPets-responses-0-media-examples';

    await userEvent.click(screen.getByTestId(`${prefix}-tabs-tab-1`));
    expect(screen.getByTestId(`${prefix}-code-content`)).toHaveTextContent('Whiskers');
  });
});

describe('MediaTypeViewer', () => {
  it('resets media selection when its content payload is replaced', async () => {
    const first = [
      { contentType: 'application/json', schema: { types: ['string'] } },
      { contentType: 'application/xml', schema: { types: ['number'] } },
    ];
    const second = [
      { contentType: 'text/plain', schema: { types: ['boolean'] } },
      { contentType: 'text/csv', schema: { types: ['array'] } },
    ];
    const { rerender } = render(MediaTypeViewer, { content: first, testId: 'replace-media' });

    await userEvent.click(screen.getByTestId('replace-media-tabs-tab-1'));
    expect(screen.getByTestId('replace-media-tabs-tab-1')).toHaveAttribute('aria-selected', 'true');

    await rerender({ content: second, testId: 'replace-media' });
    expect(screen.getByTestId('replace-media-tabs-tab-0')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('replace-media-schema-root-property-type')).toHaveTextContent(
      'boolean',
    );
  });
});

describe('ExampleViewer', () => {
  it('resets example selection when its examples are replaced', async () => {
    const first = [
      { name: 'First', value: { source: 'first' } },
      { name: 'Second', value: { source: 'second' } },
    ];
    const second = [
      { name: 'Replacement', value: { source: 'replacement' } },
      { name: 'Alternate', value: { source: 'alternate' } },
    ];
    const { rerender } = render(ExampleViewer, { examples: first, testId: 'replace-example' });

    await userEvent.click(screen.getByTestId('replace-example-tabs-tab-1'));
    expect(screen.getByTestId('replace-example-code-content')).toHaveTextContent('second');

    await rerender({ examples: second, testId: 'replace-example' });
    expect(screen.getByTestId('replace-example-tabs-tab-0')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('replace-example-code-content')).toHaveTextContent('replacement');
  });

  it('contains example serialization failures', () => {
    render(ExampleViewer, {
      examples: [{ name: 'Unsupported value', value: 1n }],
      testId: 'invalid-example',
    });

    expect(screen.getByTestId('invalid-example-code-content')).toHaveTextContent(
      'This example could not be serialized as JSON.',
    );
  });
});

describe('DocLayout', () => {
  it('provides named navigation, content and on-page regions', () => {
    render(DocLayoutHarness);
    expect(screen.getByTestId('doc-layout-sidebar')).toHaveAccessibleName(
      'Documentation navigation',
    );
    expect(screen.getByTestId('doc-layout-content')).toHaveTextContent('Document content');
    expect(screen.getByTestId('doc-layout-right-rail')).toHaveAccessibleName('On this page');
  });
});
