import { describe, expect, it } from 'vitest';
import { isApiDocument, isManifest } from './validate.js';

const MANIFEST = {
  schemaVersion: 1,
  title: 'APIs',
  generatedAt: '2026-09-10T00:00:00.000Z',
  generator: 'apibox-test',
  documents: [{ id: 'pets', kind: 'openapi', title: 'Pets', version: '1.0.0', path: 'pets.json' }],
};

const DOCUMENT = {
  id: 'pets',
  kind: 'openapi',
  specVersion: '3.1.0',
  title: 'Pets',
  version: '1.0.0',
  servers: [],
  tags: [],
  nav: [],
  warnings: [],
  securitySchemes: [],
  operations: [],
  schemas: [],
};

describe('runtime model validation', () => {
  it('accepts the canonical manifest and optional OpenAPI security', () => {
    expect(isManifest(MANIFEST)).toBe(true);
    expect(isApiDocument(DOCUMENT)).toBe(true);
  });

  it('rejects incompatible manifests and malformed operations', () => {
    expect(isManifest({ ...MANIFEST, schemaVersion: 2 })).toBe(false);
    expect(
      isApiDocument({
        ...DOCUMENT,
        operations: [{ id: 'broken', method: 'GET' }],
      }),
    ).toBe(false);
  });

  it('rejects malformed nested renderer data', () => {
    expect(isApiDocument({ ...DOCUMENT, servers: [{ name: 'Production' }] })).toBe(false);
    expect(isApiDocument({ ...DOCUMENT, schemas: [{ name: 'Pet', types: 'object' }] })).toBe(false);
    expect(
      isApiDocument({
        ...DOCUMENT,
        operations: [
          {
            id: 'listPets',
            method: 'GET',
            path: '/pets',
            parameters: [],
            responses: [null],
            security: [],
            tags: [],
          },
        ],
      }),
    ).toBe(false);
  });

  it('rejects duplicate keyed identifiers in renderer collections', () => {
    expect(
      isApiDocument({
        ...DOCUMENT,
        nav: [
          { id: 'pets', label: 'Pets' },
          { id: 'pets', label: 'Duplicate pets' },
        ],
      }),
    ).toBe(false);
    expect(
      isApiDocument({
        ...DOCUMENT,
        nav: [
          {
            id: 'pets',
            label: 'Pets',
            children: [
              { id: 'listPets', label: 'List pets' },
              { id: 'listPets', label: 'Duplicate operation' },
            ],
          },
        ],
      }),
    ).toBe(false);
  });

  it('rejects cyclic host-provided values without recursing', () => {
    const cyclic = { ...DOCUMENT, nav: [] as unknown[] };
    cyclic.nav.push(cyclic);
    expect(isApiDocument(cyclic)).toBe(false);
  });

  it('accepts webhooks as an optional array of operations, absent or present', () => {
    expect(isApiDocument({ ...DOCUMENT, webhooks: undefined })).toBe(true);
    expect(
      isApiDocument({
        ...DOCUMENT,
        webhooks: [
          {
            id: 'petAdopted',
            method: 'POST',
            path: 'petAdopted',
            deprecated: false,
            tags: [],
            servers: [],
            parameters: [],
            responses: [],
          },
        ],
      }),
    ).toBe(true);
    expect(isApiDocument({ ...DOCUMENT, webhooks: [{ id: 'broken' }] })).toBe(false);
  });

  it('accepts an example with only externalValue, whose `value` key JSON serialization drops entirely', () => {
    // parseExamples builds `{ value: undefined, externalValue: '...' }` for this case; once
    // round-tripped through JSON (how the CLI persists a document), the `value` key is gone
    // outright rather than present-and-undefined -- `'value' in value` alone would reject it.
    expect(
      isApiDocument({
        ...DOCUMENT,
        operations: [
          {
            id: 'listPets',
            method: 'GET',
            path: '/pets',
            deprecated: false,
            tags: [],
            servers: [],
            parameters: [],
            responses: [
              {
                status: '200',
                headers: [],
                content: [
                  {
                    contentType: 'application/json',
                    examples: [{ name: 'remote', externalValue: 'https://example.com/x.json' }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});
