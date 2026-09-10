import type { OpenApiDocument } from '@apibox/core';
import type { DocumentManifest } from './data-source.js';

export const DOCUMENT: OpenApiDocument = {
  id: 'petstore',
  kind: 'openapi',
  specVersion: '3.1.0',
  title: 'Petstore',
  version: '1.0.0',
  servers: [],
  tags: [{ name: 'pets' }],
  nav: [
    {
      id: 'tag-pets',
      label: 'Pets',
      children: [
        { id: 'listPets', label: 'List pets', badge: 'GET' },
        { id: 'createPet', label: 'Create pet', badge: 'POST' },
      ],
    },
  ],
  warnings: [],
  securitySchemes: [],
  security: [],
  operations: [
    {
      id: 'listPets',
      method: 'GET',
      path: '/pets',
      summary: 'List pets',
      deprecated: false,
      tags: ['pets'],
      servers: [],
      parameters: [],
      responses: [],
    },
  ],
  schemas: [],
};

export const MANIFEST: DocumentManifest = {
  schemaVersion: 1,
  title: 'Example APIs',
  generatedAt: '2026-09-10T00:00:00.000Z',
  generator: 'apibox-test',
  documents: [
    {
      id: DOCUMENT.id,
      title: DOCUMENT.title,
      kind: DOCUMENT.kind,
      version: DOCUMENT.version,
      path: 'petstore.json',
    },
  ],
};
