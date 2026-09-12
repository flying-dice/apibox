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

  it('validates a JSON-RPC document, including the card-44 component catalogues', () => {
    const RPC_DOCUMENT = {
      id: 'wallet',
      kind: 'jsonrpc',
      specVersion: '1.3.2',
      title: 'Wallet',
      version: '1.0.0',
      servers: [],
      tags: [],
      nav: [],
      warnings: [],
      methods: [],
      schemas: [],
      contentDescriptors: [],
      tagCatalog: [],
      exampleCatalog: [],
      examplePairingCatalog: [],
      linkCatalog: [],
    };
    expect(isApiDocument(RPC_DOCUMENT)).toBe(true);

    expect(
      isApiDocument({
        ...RPC_DOCUMENT,
        tagCatalog: [{ name: 'accounts', description: 'Account methods.' }],
        exampleCatalog: [{ name: 'Zero', value: '0' }],
        examplePairingCatalog: [{ name: 'Pair', params: [], result: '0' }],
        linkCatalog: [{ name: 'Retry', method: 'getBalance' }],
      }),
    ).toBe(true);

    // Missing a catalogue entirely -- not just empty -- must fail, the same way a document
    // missing `contentDescriptors` outright already did before this card.
    const { tagCatalog: _omitted, ...withoutTagCatalog } = RPC_DOCUMENT;
    expect(isApiDocument(withoutTagCatalog)).toBe(false);
  });

  it("validates a JSON Schema document's optional $vocabulary", () => {
    const SCHEMA_DOCUMENT = {
      id: 'profile',
      kind: 'jsonschema',
      specVersion: '2020-12',
      title: 'Profile',
      version: '2020-12',
      servers: [],
      tags: [],
      nav: [],
      warnings: [],
      schemas: [],
    };
    expect(isApiDocument(SCHEMA_DOCUMENT)).toBe(true);
    expect(
      isApiDocument({
        ...SCHEMA_DOCUMENT,
        vocabulary: [{ uri: 'https://json-schema.org/draft/2020-12/vocab/core', mandatory: true }],
      }),
    ).toBe(true);
    expect(isApiDocument({ ...SCHEMA_DOCUMENT, vocabulary: [{ uri: 'https://x' }] })).toBe(false);
  });
});
