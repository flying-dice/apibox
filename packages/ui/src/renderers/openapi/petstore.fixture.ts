import type { OpenApiDocument, Operation, SchemaNode } from '@apibox/core';
import { normaliseSchema } from '@apibox/core';

const PET = normaliseSchema(
  {
    type: 'object',
    description: 'A pet available in the store.',
    required: ['id', 'name', 'status'],
    properties: {
      id: { type: 'integer', format: 'int64', readOnly: true },
      name: { type: 'string', minLength: 1, maxLength: 64 },
      status: { type: 'string', enum: ['available', 'pending', 'sold'] },
      tags: { type: 'array', items: { type: 'string' } },
    },
  },
  {},
  'Pet',
) as SchemaNode;

const NEW_PET = normaliseSchema(
  {
    type: 'object',
    description: 'The fields accepted when creating a pet.',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      tags: { type: 'array', items: { type: 'string' } },
    },
  },
  {},
  'NewPet',
) as SchemaNode;

const ERROR = normaliseSchema(
  {
    type: 'object',
    required: ['code', 'message'],
    properties: { code: { type: 'string' }, message: { type: 'string' } },
  },
  {},
  'Error',
) as SchemaNode;

const petJsonMedia = {
  contentType: 'application/json',
  schema: PET,
  examples: [
    {
      name: 'Fido',
      summary: 'A single available pet',
      value: { id: 1, name: 'Fido', status: 'available' },
    },
    {
      name: 'Whiskers',
      value: { id: 2, name: 'Whiskers', status: 'pending' },
    },
  ],
};

const errorJsonMedia = { contentType: 'application/json', schema: ERROR };

function createOperation(
  overrides: Partial<Operation> & Pick<Operation, 'id' | 'method' | 'path'>,
): Operation {
  return {
    summary: overrides.id,
    deprecated: false,
    tags: ['pets'],
    servers: [],
    parameters: [],
    responses: [],
    ...overrides,
  };
}

export const PETSTORE_DOCUMENT: OpenApiDocument = {
  id: 'petstore',
  kind: 'openapi',
  specVersion: '3.1.0',
  title: 'Petstore',
  version: '1.4.0',
  summary: 'A small store that sells pets.',
  description: 'The canonical example API, rendered entirely by apibox components.',
  contact: { name: 'Petstore Support', url: 'https://example.com/support' },
  license: { name: 'MIT' },
  externalDocs: { description: 'Petstore guide', url: 'https://example.com/docs' },
  servers: [
    { name: 'Production', url: 'https://api.example.com/v1', description: 'Production' },
    { name: 'Staging', url: 'https://staging.api.example.com/v1', description: 'Staging' },
  ],
  tags: [
    { name: 'pets', description: 'Everything about the animals in the store.' },
    { name: 'store', description: 'Orders and inventory.' },
  ],
  securitySchemes: [
    { name: 'apiKey', type: 'apiKey', in: 'header', paramName: 'X-API-Key' },
    {
      name: 'oauth',
      type: 'oauth2',
      flows: [
        {
          kind: 'authorizationCode',
          authorizationUrl: 'https://example.com/oauth/authorize',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: [
            { name: 'pets:read', description: 'Read pets' },
            { name: 'pets:write', description: 'Create and modify pets' },
          ],
        },
      ],
    },
  ],
  security: [{ alternatives: [{ scheme: 'apiKey', scopes: [] }] }],
  operations: [
    createOperation({
      id: 'listPets',
      method: 'GET',
      path: '/pets',
      summary: 'List pets',
      description: 'Returns a paginated list of pets.',
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Maximum number of pets to return.',
          schema: normaliseSchema({ type: 'integer', minimum: 1, maximum: 100 }),
        },
        {
          name: 'X-Request-Id',
          in: 'header',
          required: false,
          schema: normaliseSchema({ type: 'string', format: 'uuid' }),
        },
      ],
      responses: [
        {
          status: '200',
          description: 'A page of pets.',
          headers: [
            {
              name: 'X-Total-Count',
              description: 'Total matching pets.',
              schema: normaliseSchema({ type: 'integer' }),
            },
          ],
          content: [
            {
              contentType: 'application/json',
              schema: { types: ['array'], items: PET },
              examples: petJsonMedia.examples,
            },
          ],
        },
        {
          status: '400',
          description: 'The request was malformed.',
          headers: [],
          content: [errorJsonMedia],
        },
      ],
    }),
    createOperation({
      id: 'createPet',
      method: 'POST',
      path: '/pets',
      summary: 'Create a pet',
      requestBody: {
        required: true,
        description: 'The pet to add.',
        content: [
          {
            contentType: 'application/json',
            schema: NEW_PET,
            examples: [{ name: 'Minimal', value: { name: 'Rex' } }],
          },
          { contentType: 'application/xml', schema: NEW_PET },
        ],
      },
      responses: [
        { status: '201', description: 'The created pet.', headers: [], content: [petJsonMedia] },
        { status: '409', description: 'A pet with that name exists.', headers: [], content: [] },
      ],
    }),
    createOperation({
      id: 'getPet',
      method: 'GET',
      path: '/pets/{petId}',
      summary: 'Get a pet',
      parameters: [
        {
          name: 'petId',
          in: 'path',
          required: true,
          schema: normaliseSchema({ type: 'integer', format: 'int64' }),
        },
      ],
      responses: [
        { status: '200', description: 'The pet.', headers: [], content: [petJsonMedia] },
        { status: '404', description: 'No such resource.', headers: [], content: [errorJsonMedia] },
      ],
    }),
    createOperation({
      id: 'deletePet',
      method: 'DELETE',
      path: '/pets/{petId}',
      summary: 'Delete a pet',
      deprecated: true,
      parameters: [
        { name: 'petId', in: 'path', required: true, schema: normaliseSchema({ type: 'integer' }) },
      ],
      responses: [{ status: '204', description: 'Deleted.', headers: [], content: [] }],
    }),
    createOperation({
      id: 'getInventory',
      method: 'GET',
      path: '/store/inventory',
      summary: 'Inventory by status',
      tags: ['store'],
      security: [],
      responses: [
        {
          status: '200',
          description: 'A map of status to quantity.',
          headers: [],
          content: [
            {
              contentType: 'application/json',
              schema: normaliseSchema({
                type: 'object',
                additionalProperties: { type: 'integer' },
              }),
            },
          ],
        },
      ],
    }),
  ],
  schemas: [PET, NEW_PET, ERROR],
  nav: [
    {
      id: 'tag-pets',
      label: 'pets',
      children: [
        { id: 'listPets', label: 'List pets', badge: 'GET', badgeKind: 'get' },
        { id: 'createPet', label: 'Create a pet', badge: 'POST', badgeKind: 'post' },
        { id: 'getPet', label: 'Get a pet', badge: 'GET', badgeKind: 'get' },
        {
          id: 'deletePet',
          label: 'Delete a pet',
          badge: 'DELETE',
          badgeKind: 'delete',
          deprecated: true,
        },
      ],
    },
    {
      id: 'tag-store',
      label: 'store',
      children: [
        { id: 'getInventory', label: 'Inventory by status', badge: 'GET', badgeKind: 'get' },
      ],
    },
    {
      id: 'schemas',
      label: 'Schemas',
      children: [
        { id: 'schema-pet', label: 'Pet' },
        { id: 'schema-newpet', label: 'NewPet' },
        { id: 'schema-error', label: 'Error' },
      ],
    },
  ],
  warnings: [],
};
