import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectFormat, UnsupportedDocumentError } from './detect.js';
import { parseDocument } from './document.js';
import { loadApiDocument, parseApiDocument } from './parse.js';
import type {
  AsyncApiDocument,
  JsonRpcDocument,
  JsonSchemaDocument,
  OpenApiDocument,
} from './types.js';

const examples = (name: string) =>
  fileURLToPath(new URL(`../../../examples/${name}`, import.meta.url));
const fixtures = (name: string) =>
  fileURLToPath(new URL(`../test/fixtures/${name}`, import.meta.url));
const repoRoot = (name: string) => fileURLToPath(new URL(`../../../${name}`, import.meta.url));

describe('detectFormat', () => {
  it('identifies each format from its root version marker', () => {
    expect(detectFormat({ openapi: '3.1.0' })).toEqual({ format: 'openapi', specVersion: '3.1.0' });
    expect(detectFormat({ asyncapi: '3.0.0' })).toEqual({
      format: 'asyncapi',
      specVersion: '3.0.0',
    });
    expect(detectFormat({ openrpc: '1.2.6' })).toEqual({ format: 'jsonrpc', specVersion: '1.2.6' });
  });

  it('recognises Swagger 2.0 so it can be rejected with a useful message', () => {
    expect(detectFormat({ swagger: '2.0' })?.format).toBe('openapi');
  });

  it('returns undefined for anything else', () => {
    expect(detectFormat({ hello: 'world' })).toBeUndefined();
    expect(detectFormat('not an object')).toBeUndefined();
    expect(detectFormat(null)).toBeUndefined();
  });

  it('recognises a JSON Schema dialect URI, tolerant of http/https and a trailing #', () => {
    expect(detectFormat({ $schema: 'https://json-schema.org/draft/2020-12/schema' })).toEqual({
      format: 'jsonschema',
      specVersion: '2020-12',
    });
    expect(detectFormat({ $schema: 'https://json-schema.org/draft/2019-09/schema#' })).toEqual({
      format: 'jsonschema',
      specVersion: '2019-09',
    });
    expect(detectFormat({ $schema: 'http://json-schema.org/draft-07/schema#' })).toEqual({
      format: 'jsonschema',
      specVersion: 'draft-07',
    });
    expect(detectFormat({ $schema: 'http://json-schema.org/draft-06/schema#' })?.specVersion).toBe(
      'draft-06',
    );
    expect(detectFormat({ $schema: 'http://json-schema.org/draft-04/schema#' })?.specVersion).toBe(
      'draft-04',
    );
  });

  it('does not detect JSON Schema from an unrecognised or absent $schema', () => {
    // The whole point: every JSON object is technically a valid schema, so nothing short
    // of a recognised dialect URI (or an explicit format) may trigger detection.
    expect(detectFormat({ $schema: 'https://json.schemastore.org/tsconfig' })).toBeUndefined();
    expect(detectFormat({ type: 'object', properties: {} })).toBeUndefined();
  });

  it('lets an explicit hint force jsonschema even without $schema', () => {
    expect(detectFormat({ type: 'string' }, { format: 'jsonschema' })).toEqual({
      format: 'jsonschema',
      specVersion: '',
    });
  });
});

describe('parseApiDocument', () => {
  it('rejects a document with no recognisable version marker', async () => {
    await expect(parseApiDocument({ hello: 'world' })).rejects.toThrow(UnsupportedDocumentError);
  });

  it('rejects Swagger 2.0 with an actionable message', async () => {
    const raw = JSON.parse(await readFile(fixtures('swagger2.json'), 'utf8'));
    await expect(parseApiDocument(raw)).rejects.toThrow(/Swagger 2\.0.*swagger2openapi/s);
  });

  describe('false-positive corpus', () => {
    // The single most important test in the JSON Schema feature: every one of these is a
    // real, valid JSON object with no `$schema`, and none of them may be mistaken for a
    // published JSON Schema document. If this test fails, `apibox build '**/*.json'` can
    // turn a `package.json` into a documentation page.
    it.each([
      ['package.json', 'package.json'],
      ['tsconfig.base.json', 'tsconfig.base.json'],
      ['biome.json', 'biome.json'],
    ])('rejects %s', async (_label, file) => {
      const raw = JSON.parse(await readFile(repoRoot(file), 'utf8'));
      await expect(parseApiDocument(raw)).rejects.toThrow(UnsupportedDocumentError);
    });

    it('rejects a GitHub Actions workflow', async () => {
      const text = await readFile(repoRoot('.github/workflows/ci.yml'), 'utf8');
      const raw = parseDocument(text);
      await expect(parseApiDocument(raw)).rejects.toThrow(UnsupportedDocumentError);
    });
  });
});

describe('JSON Schema', () => {
  it('parses a 2020-12 document: root, named $defs, and a resolved internal $ref', async () => {
    const doc = (await loadApiDocument(examples('user-profile.schema.json'))) as JsonSchemaDocument;

    expect(doc.kind).toBe('jsonschema');
    expect(doc.specVersion).toBe('2020-12');
    expect(doc.version).toBe('2020-12');
    expect(doc.title).toBe('User Profile');
    expect(doc.schemaId).toBe('https://apibox.dev/schemas/user-profile.json');
    expect(doc.warnings).toEqual([]);

    expect(doc.root?.types).toEqual(['object']);
    expect(doc.root?.properties?.map((p) => p.name)).toEqual(['id', 'displayName', 'address']);
    expect(doc.root?.properties?.find((p) => p.name === 'address')?.refName).toBe('Address');

    expect(doc.schemas.map((s) => s.name)).toEqual(['Address']);
  });

  it('parses a draft-07 document: root and named `definitions`', async () => {
    const doc = (await loadApiDocument(
      fixtures('widget-draft07.schema.json'),
    )) as JsonSchemaDocument;

    expect(doc.specVersion).toBe('draft-07');
    expect(doc.version).toBe('draft-07');
    expect(doc.root?.properties?.map((p) => p.name)).toEqual(['name', 'color']);
    expect(doc.root?.properties?.find((p) => p.name === 'color')?.refName).toBe('Color');
    expect(doc.schemas.map((s) => s.name)).toEqual(['Color']);
  });

  it('parses draft-04, reading its array-form tuple items and `id` keyword', async () => {
    const doc = (await parseApiDocument({
      $schema: 'http://json-schema.org/draft-04/schema#',
      id: 'https://apibox.dev/schemas/legacy.json',
      title: 'Legacy',
      type: 'array',
      items: [{ type: 'string' }, { type: 'number' }],
    })) as JsonSchemaDocument;

    expect(doc.specVersion).toBe('draft-04');
    expect(doc.schemaId).toBe('https://apibox.dev/schemas/legacy.json');
    expect(doc.root?.tupleItems?.map((i) => i.types)).toEqual([['string'], ['number']]);
  });

  it('warns and defaults the dialect for an unrecognised $schema', async () => {
    const doc = (await parseApiDocument(
      { $schema: 'https://example.com/my-custom-dialect', type: 'string' },
      { format: 'jsonschema' },
    )) as JsonSchemaDocument;

    expect(doc.specVersion).toBe('2020-12');
    expect(doc.warnings).toContainEqual(expect.stringMatching(/Unrecognised \$schema dialect/));
  });

  it('warns and defaults the dialect when $schema is absent, given an explicit format', async () => {
    const doc = (await parseApiDocument(
      { type: 'object', properties: { a: { type: 'string' } } },
      { format: 'jsonschema' },
    )) as JsonSchemaDocument;

    expect(doc.specVersion).toBe('2020-12');
    expect(doc.warnings).toContainEqual(expect.stringMatching(/No \$schema dialect declared/));
    expect(doc.root?.properties?.map((p) => p.name)).toEqual(['a']);
  });

  it('warns when a document has neither a root schema nor any $defs/definitions', async () => {
    const doc = (await parseApiDocument({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
    })) as JsonSchemaDocument;

    expect(doc.root).toBeUndefined();
    expect(doc.schemas).toEqual([]);
    expect(doc.warnings).toContainEqual(
      expect.stringMatching(/neither a root schema nor any \$defs\/definitions/),
    );
  });

  it('rejects a document with an unrecognised dialect and no explicit format', async () => {
    await expect(
      parseApiDocument({ $schema: 'https://example.com/my-custom-dialect', type: 'string' }),
    ).rejects.toThrow(UnsupportedDocumentError);
  });

  describe('root description promotion', () => {
    it('promotes an object root description to the document, and strips it off the root node', async () => {
      const doc = (await loadApiDocument(
        examples('user-profile.schema.json'),
      )) as JsonSchemaDocument;

      expect(doc.description).toBe("A user's public profile.");
      expect(doc.root?.description).toBeUndefined();
    });

    it('still surfaces a oneOf composition root, description promoted or not', async () => {
      const doc = (await parseApiDocument(
        {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          description: 'One of two shapes.',
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
        { format: 'jsonschema' },
      )) as JsonSchemaDocument;

      expect(doc.description).toBe('One of two shapes.');
      expect(doc.root?.description).toBeUndefined();
      expect(doc.root?.compositions?.[0]?.kind).toBe('oneOf');
    });

    it('still surfaces a non-object scalar root, description promoted or not', async () => {
      const doc = (await parseApiDocument(
        {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          description: 'A colour name.',
          type: 'string',
          enum: ['red', 'green', 'blue'],
        },
        { format: 'jsonschema' },
      )) as JsonSchemaDocument;

      expect(doc.description).toBe('A colour name.');
      expect(doc.root?.description).toBeUndefined();
      expect(doc.root?.types).toEqual(['string']);
      expect(doc.root?.enum).toEqual(['red', 'green', 'blue']);
    });

    it('leaves the root node description alone when the document has none to promote', async () => {
      const doc = (await parseApiDocument(
        {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: { a: { type: 'string', description: 'A property description.' } },
        },
        { format: 'jsonschema' },
      )) as JsonSchemaDocument;

      expect(doc.description).toBeUndefined();
      expect(doc.root?.description).toBeUndefined();
      expect(doc.root?.properties?.[0]?.description).toBe('A property description.');
    });
  });
});

describe('OpenAPI', () => {
  const load = () => loadApiDocument(examples('petstore.yaml')) as Promise<OpenApiDocument>;

  it('reads the document envelope', async () => {
    const doc = await load();
    expect(doc.kind).toBe('openapi');
    expect(doc.id).toBe('petstore');
    expect(doc.title).toBe('Petstore');
    expect(doc.version).toBe('1.4.0');
    expect(doc.specVersion).toBe('3.1.0');
    expect(doc.servers.map((s) => s.url)).toEqual([
      'https://api.example.com/v1',
      'https://staging.api.example.com/v1',
    ]);
    expect(doc.warnings).toEqual([]);
  });

  it('allocates unique navigation ids for colliding tag and schema slugs', async () => {
    const doc = (await parseApiDocument({
      openapi: '3.1.0',
      info: { title: 'Collisions', version: '1.0.0' },
      tags: [{ name: 'Foo Bar' }, { name: 'foo-bar' }],
      paths: {
        '/one': { get: { tags: ['Foo Bar'], responses: { 200: { description: 'ok' } } } },
        '/two': { get: { tags: ['foo-bar'], responses: { 200: { description: 'ok' } } } },
      },
      components: {
        schemas: {
          'Foo Bar': { type: 'string' },
          'foo-bar': { type: 'number' },
        },
      },
    })) as OpenApiDocument;

    expect(doc.nav.map((node) => node.id)).toEqual(['tag-foo-bar', 'tag-foo-bar-2', 'schemas']);
    expect(doc.nav.at(-1)?.children?.map((node) => node.id)).toEqual([
      'schema-foo-bar',
      'schema-foo-bar-2',
    ]);
  });

  it('resolves an SPDX licence identifier to a URL', async () => {
    const doc = await load();
    expect(doc.license).toEqual({ name: 'MIT', url: 'https://spdx.org/licenses/MIT.html' });
  });

  it('reads a recognised root jsonSchemaDialect', async () => {
    const doc = (await parseApiDocument({
      openapi: '3.1.0',
      jsonSchemaDialect: 'https://json-schema.org/draft/2019-09/schema',
      info: { title: 'Dialect', version: '1.0.0' },
      paths: {},
    })) as OpenApiDocument;
    expect(doc.jsonSchemaDialect).toBe('2019-09');
  });

  it('leaves jsonSchemaDialect undefined when the document declared none, or one apibox does not recognise', async () => {
    const noDialect = (await parseApiDocument({
      openapi: '3.1.0',
      info: { title: 'No Dialect', version: '1.0.0' },
      paths: {},
    })) as OpenApiDocument;
    expect(noDialect.jsonSchemaDialect).toBeUndefined();

    const unrecognised = (await parseApiDocument({
      openapi: '3.1.0',
      jsonSchemaDialect: 'https://example.com/custom-dialect',
      info: { title: 'Custom Dialect', version: '1.0.0' },
      paths: {},
    })) as OpenApiDocument;
    expect(unrecognised.jsonSchemaDialect).toBeUndefined();
  });

  it('collects every operation with a stable id', async () => {
    const doc = await load();
    expect(doc.operations.map((o) => o.id)).toEqual([
      'listpets',
      'createpet',
      'getpet',
      'deletepet',
      'getinventory',
    ]);
    expect(doc.operations.find((o) => o.id === 'deletepet')?.deprecated).toBe(true);
  });

  it('inherits path-level parameters into each operation', async () => {
    const doc = await load();
    const getPet = doc.operations.find((o) => o.id === 'getpet');
    expect(getPet?.parameters.map((p) => p.name)).toEqual(['petId']);
    // Declared at the path, and required because it is a path parameter.
    expect(getPet?.parameters[0]?.required).toBe(true);
  });

  it('orders parameters path, query, header', async () => {
    const doc = await load();
    const listPets = doc.operations.find((o) => o.id === 'listpets');
    expect(listPets?.parameters.map((p) => p.in)).toEqual(['query', 'query', 'query', 'header']);
  });

  it('sorts responses numerically with `default` last', async () => {
    const doc = await load();
    const createPet = doc.operations.find((o) => o.id === 'createpet');
    expect(createPet?.responses.map((r) => r.status)).toEqual(['201', '400', '409']);
  });

  it('resolves a $ref-ed response and keeps its content', async () => {
    const doc = await load();
    const badRequest = doc.operations
      .find((o) => o.id === 'createpet')
      ?.responses.find((r) => r.status === '400');
    expect(badRequest?.description).toBe('The request was malformed.');
    expect(badRequest?.content[0]?.contentType).toBe('application/json');
    expect(badRequest?.content[0]?.schema?.refName).toBe('Error');
  });

  it('overrides a shared response description only where the $ref declared one', async () => {
    const doc = await load();
    // getpet's 404 $ref declares its own description; deletepet's does not.
    const getNotFound = doc.operations
      .find((o) => o.id === 'getpet')
      ?.responses.find((r) => r.status === '404');
    const deleteNotFound = doc.operations
      .find((o) => o.id === 'deletepet')
      ?.responses.find((r) => r.status === '404');
    expect(getNotFound?.description).toBe('No pet exists with the given id.');
    expect(deleteNotFound?.description).toBe('No such resource.');
  });

  it('labels an inlined $ref with the component name it came from', async () => {
    const doc = await load();
    const items = doc.operations.find((o) => o.id === 'listpets')?.responses[0]?.content[0]?.schema
      ?.items;
    expect(items?.refName).toBe('Pet');
  });

  it('reads response headers', async () => {
    const doc = await load();
    const ok = doc.operations.find((o) => o.id === 'listpets')?.responses[0];
    expect(ok?.headers.map((h) => h.name)).toEqual(['X-Total-Count']);
  });

  it('carries named examples through', async () => {
    const doc = await load();
    const example = doc.operations.find((o) => o.id === 'listpets')?.responses[0]?.content[0]
      ?.examples?.[0];
    expect(example?.name).toBe('twoPets');
    expect(example?.summary).toBe('Two pets');
    expect(Array.isArray(example?.value)).toBe(true);
  });

  it('distinguishes an explicitly public operation from an inheriting one', async () => {
    const doc = await load();
    // `security: []` on the operation means public.
    expect(doc.operations.find((o) => o.id === 'getinventory')?.security).toEqual([]);
    // No `security` key means it inherits the document default.
    expect(doc.operations.find((o) => o.id === 'listpets')?.security).toBeUndefined();
    expect(doc.security?.[0]?.alternatives[0]?.scheme).toBe('apiKey');
  });

  it('reads security schemes including OAuth flows and scopes', async () => {
    const doc = await load();
    const apiKey = doc.securitySchemes.find((s) => s.name === 'apiKey');
    expect(apiKey).toMatchObject({ type: 'apiKey', in: 'header', paramName: 'X-API-Key' });

    const oauth = doc.securitySchemes.find((s) => s.name === 'oauth');
    expect(oauth?.flows?.[0]?.kind).toBe('authorizationCode');
    expect(oauth?.flows?.[0]?.scopes.map((s) => s.name)).toEqual(['pets:read', 'pets:write']);
  });

  it('handles a recursive schema without hanging', async () => {
    const doc = (await loadApiDocument(fixtures('recursive.yaml'))) as OpenApiDocument;
    const node = doc.schemas.find((s) => s.name === 'Node');
    const sibling = node?.properties?.find((p) => p.name === 'sibling');
    expect(sibling?.circularRef).toBe('Node');
    expect(sibling?.properties).toBeUndefined();
  });

  it('survives a broken external $ref: warns, keeps the rest, marks what it lost', async () => {
    const doc = (await loadApiDocument(fixtures('broken-external-ref.yaml'))) as OpenApiDocument;

    // The failure is reported rather than swallowed, and names the offending location.
    expect(doc.warnings.join(' ')).toMatch(/Could not resolve \$ref at .*Thing.*external/);

    // Everything resolvable still renders.
    const thing = doc.schemas.find((s) => s.name === 'Thing');
    expect(thing?.properties?.map((p) => p.name)).toEqual(['id', 'external']);
    expect(thing?.properties?.[0]?.types).toEqual(['string']);

    // And the part that failed is explicitly marked, not silently empty or null.
    const external = thing?.properties?.find((p) => p.name === 'external');
    expect(external?.unresolvedRef).toBe(
      'https://example.invalid/nope.yaml#/components/schemas/Missing',
    );
    expect(external?.required).toBe(true);
  });

  it('still resolves internal $refs when an external one fails', async () => {
    // The regression this guards: abandoning the whole dereference pass on one bad
    // external URL leaves every internal $ref unresolved, so the document renders as
    // nothing but unresolved markers.
    const doc = (await loadApiDocument(fixtures('broken-external-ref.yaml'))) as OpenApiDocument;

    const responseSchema = doc.operations.find((o) => o.id === 'listthings')?.responses[0]
      ?.content[0]?.schema;

    expect(responseSchema?.unresolvedRef).toBeUndefined();
    expect(responseSchema?.refName).toBe('Thing');
    expect(responseSchema?.properties?.map((p) => p.name)).toEqual(['id', 'external']);
  });

  it('ignores specification extensions in the responses map', async () => {
    const doc = (await loadApiDocument(fixtures('broken-external-ref.yaml'))) as OpenApiDocument;
    const statuses = doc.operations
      .find((o) => o.id === 'listthings')
      ?.responses.map((r) => r.status);
    // `x-internal` is an extension, not a status, and must not sort to the top as one.
    expect(statuses).toEqual(['200']);
  });

  it('reads a parameter declared with `content` instead of `schema`', async () => {
    // OpenAPI allows either, and `content` is the prescribed way to describe a parameter
    // whose value is a JSON object. Reading only `schema` renders these as untyped.
    const doc = (await parseApiDocument({
      openapi: '3.1.0',
      info: { title: 'C', version: '1.0.0' },
      paths: {
        '/a': {
          get: {
            operationId: 'a',
            parameters: [
              {
                name: 'filter',
                in: 'query',
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { q: { type: 'string' } } },
                  },
                },
              },
            ],
            responses: {
              '200': {
                description: 'ok',
                headers: {
                  'X-Meta': {
                    content: { 'application/json': { schema: { type: 'object' } } },
                  },
                },
              },
            },
          },
        },
      },
    })) as OpenApiDocument;

    const parameter = doc.operations[0]?.parameters[0];
    expect(parameter?.content?.[0]?.contentType).toBe('application/json');
    // Also surfaced as `schema`, so a renderer that only knows about `schema` still works.
    expect(parameter?.schema?.properties?.map((p) => p.name)).toEqual(['q']);

    const header = doc.operations[0]?.responses[0]?.headers[0];
    expect(header?.content?.[0]?.contentType).toBe('application/json');
    expect(header?.schema?.types).toEqual(['object']);
  });

  it('builds a nav grouped by tag, in document tag order, with a Webhooks and a Schemas group', async () => {
    // The fixture gained a `webhooks` entry for card 38 -- Webhooks sits between the
    // tag groups and Schemas, mirroring buildNav's own push order.
    const doc = await load();
    expect(doc.nav.map((n) => n.label)).toEqual(['pets', 'store', 'Webhooks', 'Schemas']);
    expect(doc.nav[0]?.children?.map((c) => c.badge)).toEqual(['GET', 'POST', 'GET', 'DELETE']);
    expect(doc.nav[0]?.children?.at(-1)?.deprecated).toBe(true);
  });

  it('reports missing paths as a warning rather than throwing', async () => {
    const doc = (await parseApiDocument({
      openapi: '3.1.0',
      info: { title: 'Empty', version: '1.0.0' },
    })) as OpenApiDocument;
    expect(doc.operations).toEqual([]);
    expect(doc.warnings).toContain('The document declares no paths.');
  });

  describe('parameter serialisation', () => {
    const withParameter = async (parameter: Record<string, unknown>) => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'S', version: '1.0.0' },
        paths: {
          '/a': {
            get: {
              operationId: 'a',
              parameters: [{ name: 'p', schema: { type: 'string' }, ...parameter }],
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;
      return doc.operations[0]?.parameters[0];
    };

    it('defaults style to `form` for query and cookie, `simple` for path and header, undeclared', async () => {
      expect(await withParameter({ in: 'query' })).toMatchObject({
        style: { value: 'form', declared: false },
      });
      expect(await withParameter({ in: 'cookie' })).toMatchObject({
        style: { value: 'form', declared: false },
      });
      expect(await withParameter({ in: 'header' })).toMatchObject({
        style: { value: 'simple', declared: false },
      });
      expect(await withParameter({ in: 'path', required: true })).toMatchObject({
        style: { value: 'simple', declared: false },
      });
    });

    it('defaults explode to true only when the effective style is form, undeclared either way', async () => {
      expect(await withParameter({ in: 'query' })).toMatchObject({
        explode: { value: true, declared: false },
      });
      expect(await withParameter({ in: 'header' })).toMatchObject({
        explode: { value: false, declared: false },
      });
      expect(await withParameter({ in: 'query', style: 'pipeDelimited' })).toMatchObject({
        style: { value: 'pipeDelimited', declared: true },
        explode: { value: false, declared: false },
      });
    });

    it('marks style and explode as declared when the document states them, even matching the default', async () => {
      const parameter = await withParameter({ in: 'query', style: 'form', explode: true });
      expect(parameter).toMatchObject({
        style: { value: 'form', declared: true },
        explode: { value: true, declared: true },
      });
    });

    it('lets a declared explode override the location default', async () => {
      // Query defaults to explode: true; declaring false must survive, not be overwritten.
      const parameter = await withParameter({ in: 'query', explode: false });
      expect(parameter?.explode).toEqual({ value: false, declared: true });
    });

    it('captures allowReserved and allowEmptyValue only when declared true', async () => {
      const declared = await withParameter({
        in: 'query',
        allowReserved: true,
        allowEmptyValue: true,
      });
      expect(declared?.allowReserved).toBe(true);
      expect(declared?.allowEmptyValue).toBe(true);

      const defaulted = await withParameter({ in: 'query' });
      expect(defaulted?.allowReserved).toBeUndefined();
      expect(defaulted?.allowEmptyValue).toBeUndefined();

      const explicitlyFalse = await withParameter({
        in: 'query',
        allowReserved: false,
        allowEmptyValue: false,
      });
      expect(explicitlyFalse?.allowReserved).toBeUndefined();
      expect(explicitlyFalse?.allowEmptyValue).toBeUndefined();
    });
  });

  describe('response links', () => {
    it('keeps a runtime-expression parameter verbatim, distinct from a literal one', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'L', version: '1.0.0' },
        paths: {
          '/pets': {
            post: {
              operationId: 'createPet',
              responses: {
                '201': {
                  description: 'created',
                  links: {
                    GetPetById: {
                      operationId: 'getPet',
                      parameters: {
                        petId: '$response.body#/id',
                        source: 'createPet',
                      },
                      description: 'The pet just created.',
                    },
                  },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const link = doc.operations[0]?.responses[0]?.links?.[0];
      expect(link?.name).toBe('GetPetById');
      expect(link?.operationId).toBe('getPet');
      expect(link?.description).toBe('The pet just created.');
      // A runtime expression string and a literal string are indistinguishable in JSON, and
      // apibox cannot evaluate either -- both must survive exactly as written.
      expect(link?.parameters).toEqual([
        { name: 'petId', value: '$response.body#/id' },
        { name: 'source', value: 'createPet' },
      ]);
    });

    it('resolves operationRef to the operation it points at', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'L', version: '1.0.0' },
        paths: {
          '/pets/{id}': {
            get: {
              operationId: 'getPet',
              responses: { '200': { description: 'ok' } },
            },
          },
          '/pets': {
            post: {
              operationId: 'createPet',
              responses: {
                '201': {
                  description: 'created',
                  links: {
                    GetPetById: { operationRef: '#/paths/~1pets~1{id}/get' },
                  },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const link = doc.operations.find((o) => o.id === 'createpet')?.responses[0]?.links?.[0];
      expect(link?.operationRef).toBe('#/paths/~1pets~1{id}/get');
      expect(link?.resolvedOperationId).toBe('getPet');
    });

    it('leaves resolvedOperationId undefined when operationRef matches nothing in the document', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'L', version: '1.0.0' },
        paths: {
          '/pets': {
            post: {
              operationId: 'createPet',
              responses: {
                '201': {
                  description: 'created',
                  links: { Nowhere: { operationRef: '#/paths/~1missing/get' } },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const link = doc.operations[0]?.responses[0]?.links?.[0];
      expect(link?.resolvedOperationId).toBeUndefined();
    });
  });

  describe('operation callbacks', () => {
    it('parses a nested callback operation, reachable by its runtime expression and method', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'C', version: '1.0.0' },
        paths: {
          '/subscriptions': {
            post: {
              operationId: 'subscribe',
              responses: { '201': { description: 'created' } },
              callbacks: {
                onEvent: {
                  '{$request.body#/callbackUrl}': {
                    post: {
                      operationId: 'notify',
                      requestBody: {
                        content: { 'application/json': { schema: { type: 'object' } } },
                      },
                      responses: { '200': { description: 'acknowledged' } },
                    },
                  },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const callback = doc.operations[0]?.callbacks?.[0];
      expect(callback?.name).toBe('onEvent');
      expect(callback?.expression).toBe('{$request.body#/callbackUrl}');
      const nested = callback?.operations[0];
      expect(nested?.method).toBe('POST');
      expect(nested?.operationId).toBe('notify');
      expect(nested?.responses[0]?.status).toBe('200');
    });

    it('does not recurse into a callback operation declaring its own callbacks', async () => {
      // OpenAPI's Operation Object schema permits `callbacks` on any operation, including one
      // reached through another callback. Parsing that would recurse without a natural bound,
      // so a callback's own operations never carry further callbacks.
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'C', version: '1.0.0' },
        paths: {
          '/subscriptions': {
            post: {
              operationId: 'subscribe',
              responses: { '201': { description: 'created' } },
              callbacks: {
                onEvent: {
                  '{$request.body#/callbackUrl}': {
                    post: {
                      operationId: 'notify',
                      responses: { '200': { description: 'ok' } },
                      callbacks: {
                        onAck: {
                          '{$request.body#/ackUrl}': {
                            post: {
                              operationId: 'ack',
                              responses: { '200': { description: 'ok' } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const nested = doc.operations[0]?.callbacks?.[0]?.operations[0];
      expect(nested?.operationId).toBe('notify');
      expect(nested?.callbacks).toBeUndefined();
    });

    it('parses a self-referential callback without hanging', async () => {
      // A cyclic $ref inside a callback's own request body (rather than in `callbacks`
      // itself, which this parser never walks recursively) is the more realistic shape a
      // self-referential callback would take. Dereferencing already handles cyclic schemas
      // elsewhere; this guards that callbacks parsing does not add a second, unbounded path.
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'C', version: '1.0.0' },
        paths: {
          '/subscriptions': {
            post: {
              operationId: 'subscribe',
              responses: { '201': { description: 'created' } },
              callbacks: {
                onEvent: {
                  '{$request.body#/callbackUrl}': {
                    post: {
                      operationId: 'notify',
                      requestBody: {
                        content: {
                          'application/json': {
                            schema: { $ref: '#/components/schemas/Node' },
                          },
                        },
                      },
                      responses: { '200': { description: 'ok' } },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Node: {
              type: 'object',
              properties: { child: { $ref: '#/components/schemas/Node' } },
            },
          },
        },
      })) as OpenApiDocument;

      const nested = doc.operations[0]?.callbacks?.[0]?.operations[0];
      const schema = nested?.requestBody?.content[0]?.schema;
      expect(schema?.refName).toBe('Node');
      expect(schema?.properties?.[0]?.circularRef).toBe('Node');
    });
  });

  describe('multipart encoding', () => {
    it('maps an encoding entry to the property it governs', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'E', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        avatar: { type: 'string', format: 'binary' },
                        metadata: { type: 'object' },
                      },
                    },
                    encoding: {
                      avatar: { contentType: 'image/png' },
                      metadata: { contentType: 'application/json', allowReserved: true },
                    },
                  },
                },
              },
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;

      const encoding = doc.operations[0]?.requestBody?.content[0]?.encoding;
      expect(encoding).toHaveLength(2);
      const avatar = encoding?.find((e) => e.propertyName === 'avatar');
      expect(avatar?.contentType).toBe('image/png');
      const metadata = encoding?.find((e) => e.propertyName === 'metadata');
      expect(metadata?.contentType).toBe('application/json');
      expect(metadata?.allowReserved).toBe(true);
    });

    it('defaults style to form and explode to true, marking both undeclared', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'E', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: { type: 'object', properties: { tags: { type: 'array' } } },
                    encoding: { tags: {} },
                  },
                },
              },
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;

      const entry = doc.operations[0]?.requestBody?.content[0]?.encoding?.[0];
      expect(entry?.style).toEqual({ value: 'form', declared: false });
      expect(entry?.explode).toEqual({ value: true, declared: false });
    });
  });

  describe('reference-level overrides', () => {
    // OpenAPI 3.1+ lets a $ref carry its own summary/description, overriding the target's.
    // dereferenceDocument's underlying library ($RefParser) already treats a $ref with
    // sibling keys as an "extended reference" and merges them into a fresh copy of the
    // target, so no bespoke handling is needed in @apibox/core for this -- these tests are
    // here to pin that behaviour down as something apibox relies on, not something it
    // implements.
    const withResponses = async (a: Record<string, unknown>, b: Record<string, unknown>) =>
      (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'R', version: '1.0.0' },
        paths: {
          '/a': { get: { operationId: 'a', responses: { '200': a } } },
          '/b': { get: { operationId: 'b', responses: { '200': b } } },
        },
        components: {
          responses: {
            Shared: { description: 'The target response.', content: {} },
          },
        },
      })) as OpenApiDocument;

    it('overrides the target description at a $ref that declares its own', async () => {
      const doc = await withResponses(
        { $ref: '#/components/responses/Shared', description: 'Overridden for /a.' },
        { $ref: '#/components/responses/Shared' },
      );
      const a = doc.operations.find((o) => o.id === 'a')?.responses[0];
      const b = doc.operations.find((o) => o.id === 'b')?.responses[0];
      expect(a?.description).toBe('Overridden for /a.');
      // No override declared at /b -- it inherits the target's own description, unaffected.
      expect(b?.description).toBe('The target response.');
    });

    it('does not let one use’s override leak into another use of the same target', async () => {
      const doc = await withResponses(
        { $ref: '#/components/responses/Shared', description: 'A' },
        { $ref: '#/components/responses/Shared', description: 'B' },
      );
      const a = doc.operations.find((o) => o.id === 'a')?.responses[0];
      const b = doc.operations.find((o) => o.id === 'b')?.responses[0];
      expect(a?.description).toBe('A');
      expect(b?.description).toBe('B');
    });

    it('overrides a schema property’s description at its own $ref, not just non-schema references', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'S', version: '1.0.0' },
        paths: { '/a': { get: { operationId: 'a', responses: { '200': { description: 'ok' } } } } },
        components: {
          schemas: {
            Pet: {
              type: 'object',
              description: 'A pet.',
              properties: {
                parent: {
                  $ref: '#/components/schemas/Pet',
                  description: 'The pet this one descends from, if known.',
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const pet = doc.schemas.find((s) => s.name === 'Pet');
      const parent = pet?.properties?.find((p) => p.name === 'parent');
      expect(parent?.description).toBe('The pet this one descends from, if known.');
    });
  });

  describe('3.2 constructs', () => {
    it('reads additionalOperations as operations with an arbitrary HTTP method', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'A', version: '1.0.0' },
        paths: {
          '/things': {
            get: { operationId: 'listThings', responses: { '200': { description: 'ok' } } },
            additionalOperations: {
              QUERY: {
                operationId: 'queryThings',
                summary: 'Query things with a body',
                responses: { '200': { description: 'ok' } },
              },
            },
          },
        },
      })) as OpenApiDocument;

      expect(doc.operations.map((o) => o.method)).toEqual(['GET', 'QUERY']);
      const query = doc.operations.find((o) => o.operationId === 'queryThings');
      expect(query?.summary).toBe('Query things with a body');
    });

    it('accepts the querystring parameter location', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'Q', version: '1.0.0' },
        paths: {
          '/things': {
            get: {
              operationId: 'listThings',
              parameters: [{ name: 'raw', in: 'querystring', schema: { type: 'string' } }],
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;

      expect(doc.operations[0]?.parameters[0]).toMatchObject({ name: 'raw', in: 'querystring' });
    });

    it('resolves a $ref into components.mediaTypes the same way as any other reusable component', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'M', version: '1.0.0' },
        paths: {
          '/things': {
            get: {
              operationId: 'listThings',
              responses: {
                '200': {
                  description: 'ok',
                  content: { 'application/json': { $ref: '#/components/mediaTypes/Thing' } },
                },
              },
            },
          },
        },
        components: {
          mediaTypes: {
            Thing: { schema: { type: 'object', properties: { id: { type: 'string' } } } },
          },
        },
      })) as OpenApiDocument;

      const content = doc.operations[0]?.responses[0]?.content[0];
      expect(content?.contentType).toBe('application/json');
      expect(content?.schema?.properties?.map((p) => p.name)).toEqual(['id']);
    });

    it('reads Tag.parent and Tag.kind for 3.2 nested tags', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'T', version: '1.0.0' },
        tags: [
          { name: 'animals', kind: 'nav' },
          { name: 'pets', parent: 'animals' },
        ],
        paths: {},
      })) as OpenApiDocument;

      expect(doc.tags.find((t) => t.name === 'animals')?.kind).toBe('nav');
      expect(doc.tags.find((t) => t.name === 'pets')?.parent).toBe('animals');
    });

    it('reads $self as the document URL', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        $self: 'https://api.example.com/openapi.yaml',
        info: { title: 'Self', version: '1.0.0' },
        paths: {},
      })) as OpenApiDocument;

      expect(doc.selfUrl).toBe('https://api.example.com/openapi.yaml');
    });

    it('reads an oauth2 flow’s oauth2Metadata URL', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'O', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            oauth: {
              type: 'oauth2',
              flows: {
                clientCredentials: {
                  tokenUrl: 'https://example.com/token',
                  scopes: {},
                  oauth2Metadata: 'https://example.com/.well-known/oauth-authorization-server',
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      expect(doc.securitySchemes[0]?.flows?.[0]?.oauth2MetadataUrl).toBe(
        'https://example.com/.well-known/oauth-authorization-server',
      );
    });

    it('reads Example.dataValue and serializedValue as alternative spellings of value', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'E', version: '1.0.0' },
        paths: {
          '/things': {
            get: {
              operationId: 'listThings',
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                      examples: {
                        fromData: { dataValue: { id: 1 } },
                        fromSerialized: { serializedValue: '{"id":2}' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const examples = doc.operations[0]?.responses[0]?.content[0]?.examples;
      expect(examples?.find((e) => e.name === 'fromData')?.value).toEqual({ id: 1 });
      expect(examples?.find((e) => e.name === 'fromSerialized')?.value).toBe('{"id":2}');
    });

    it('reads the xml keyword onto a schema node', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'X', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            Pet: {
              type: 'object',
              xml: { name: 'pet', namespace: 'https://example.com/schema', wrapped: false },
              properties: {
                id: { type: 'string', xml: { attribute: true } },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const pet = doc.schemas.find((s) => s.name === 'Pet');
      expect(pet?.xml).toEqual({ name: 'pet', namespace: 'https://example.com/schema' });
      expect(pet?.properties?.[0]?.xml).toEqual({ attribute: true });
    });
  });

  describe('webhooks and the other card-38 gaps', () => {
    it('reads webhooks as operations, reachable by name and method', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'W', version: '1.0.0' },
        paths: {},
        webhooks: {
          'order.shipped': {
            post: {
              operationId: 'orderShipped',
              summary: 'A new order has been shipped',
              requestBody: {
                content: { 'application/json': { schema: { type: 'object' } } },
              },
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;

      expect(doc.operations).toEqual([]);
      expect(doc.webhooks).toHaveLength(1);
      const webhook = doc.webhooks?.find((w) => w.operationId === 'orderShipped');
      expect(webhook).toMatchObject({ method: 'POST', path: 'order.shipped' });

      // Reachable from navigation the same way an operation is.
      const webhooksNav = doc.nav.find((n) => n.id === 'webhooks');
      expect(webhooksNav?.children?.map((c) => c.id)).toEqual([webhook?.id]);
    });

    it('leaves webhooks undefined when the document declares none', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'NoHooks', version: '1.0.0' },
        paths: {},
      })) as OpenApiDocument;

      expect(doc.webhooks).toBeUndefined();
      expect(doc.nav.find((n) => n.id === 'webhooks')).toBeUndefined();
    });

    it('reads Example.externalValue and keeps it distinct from an inline value', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'Ext', version: '1.0.0' },
        paths: {
          '/things': {
            get: {
              operationId: 'listThings',
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                      examples: {
                        remote: { externalValue: 'https://example.com/examples/thing.json' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })) as OpenApiDocument;

      const example = doc.operations[0]?.responses[0]?.content[0]?.examples?.find(
        (e) => e.name === 'remote',
      );
      expect(example?.externalValue).toBe('https://example.com/examples/thing.json');
      expect(example?.value).toBeUndefined();
    });

    it('reads Encoding.itemSchema and itemEncoding for an array-of-encoded-items property', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.2.0',
        info: { title: 'Enc', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: { type: 'object' },
                    encoding: {
                      attachments: {
                        contentType: 'application/octet-stream',
                        itemSchema: { type: 'string', format: 'binary' },
                        itemEncoding: { contentType: 'image/png' },
                      },
                    },
                  },
                },
              },
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;

      const encoding = doc.operations[0]?.requestBody?.content[0]?.encoding?.[0];
      expect(encoding?.itemSchema?.format).toBe('binary');
      expect(encoding?.itemEncoding?.contentType).toBe('image/png');
    });

    it('captures document-level x-* extensions, mirroring JsonRpcDocument.extensions', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'Extended', version: '1.0.0', 'x-info-badge': 'beta' },
        'x-internal': true,
        paths: {},
      })) as OpenApiDocument;

      expect(doc.extensions).toEqual([
        { key: 'x-internal', value: true },
        { key: 'x-info-badge', value: 'beta' },
      ]);
    });

    it('captures operation, tag and server x-* extensions', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'Extended', version: '1.0.0' },
        tags: [{ name: 'pets', 'x-tag-color': 'green' }],
        servers: [{ url: 'https://api.example.com', 'x-region': 'eu' }],
        paths: {
          '/pets': {
            get: {
              operationId: 'listPets',
              tags: ['pets'],
              'x-rate-limit': 100,
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      })) as OpenApiDocument;

      expect(doc.tags[0]?.extensions).toEqual([{ key: 'x-tag-color', value: 'green' }]);
      expect(doc.servers[0]?.extensions).toEqual([{ key: 'x-region', value: 'eu' }]);
      expect(doc.operations[0]?.extensions).toEqual([{ key: 'x-rate-limit', value: 100 }]);
    });

    it('distinguishes a closed schema (additionalProperties: false) from an unspecified one', async () => {
      const doc = (await parseApiDocument({
        openapi: '3.1.0',
        info: { title: 'Closed', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            Closed: { type: 'object', additionalProperties: false },
            Open: { type: 'object' },
          },
        },
      })) as OpenApiDocument;

      const closed = doc.schemas.find((s) => s.name === 'Closed');
      const open = doc.schemas.find((s) => s.name === 'Open');
      expect(closed?.allowsAdditionalProperties).toBe(false);
      expect(open?.allowsAdditionalProperties).toBeUndefined();
    });
  });
});

describe('AsyncAPI', () => {
  const load = () =>
    loadApiDocument(examples('streetlights.asyncapi.yaml')) as Promise<AsyncApiDocument>;

  it('normalises channels, operations and message payloads', async () => {
    const doc = await load();
    expect(doc.kind).toBe('asyncapi');
    expect(doc.title).toBe('Streetlights');
    expect(doc.servers[0]).toMatchObject({ name: 'mosquitto', protocol: 'mqtt' });

    const receive = doc.operations.find((o) => o.action === 'receive');
    expect(receive?.channelAddress).toContain('lighting/measured');
    expect(receive?.parameters.map((p) => p.name)).toEqual(['streetlightId']);
    expect(receive?.messages[0]?.payload?.properties?.map((p) => p.name)).toEqual([
      'lumens',
      'sentAt',
    ]);

    expect(doc.operations.some((o) => o.action === 'send')).toBe(true);
    expect(doc.nav.map((n) => n.label)).toContain('Receive');
  });

  it('reads info-level metadata: terms of service, license url, external docs, tags with their own external docs', async () => {
    const doc = await load();
    expect(doc.termsOfService).toBe('https://example.com/terms');
    expect(doc.license).toEqual({
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
    });
    expect(doc.externalDocs).toEqual({
      url: 'https://example.com/docs/streetlights',
      description: 'Streetlights API guide',
    });
    expect(doc.tags).toEqual([
      {
        name: 'telemetry',
        description: 'Readings published by a light.',
        externalDocs: { url: 'https://example.com/docs/telemetry', description: undefined },
      },
      { name: 'control', description: 'Commands sent to a light.', externalDocs: undefined },
    ]);
    expect(doc.defaultContentType).toBe('application/json');
  });

  it('parses components.securitySchemes and resolves server/operation security back to the scheme name', async () => {
    const doc = await load();
    expect(doc.securitySchemes).toEqual([
      {
        name: 'apiToken',
        type: 'httpApiKey',
        description: 'A static per-city API token.',
        in: 'header',
        paramName: 'X-Api-Token',
        httpScheme: undefined,
        bearerFormat: undefined,
        openIdConnectUrl: undefined,
        flows: undefined,
      },
    ]);

    // A `$ref` into `components.securitySchemes` resolves to the same object the component
    // itself parses to, which is how the scheme's name is recovered -- the requirement
    // model's own `.scheme().id()` is hard-coded empty by the parser library.
    expect(doc.servers[0]?.security).toEqual([
      { alternatives: [{ scheme: 'apiToken', scopes: [] }] },
    ]);
    const sendTurnOn = doc.operations.find((o) => o.id === 'sendturnon');
    expect(sendTurnOn?.security).toEqual([{ alternatives: [{ scheme: 'apiToken', scopes: [] }] }]);
  });

  it('parses server variables', async () => {
    const doc = await load();
    expect(doc.servers[0]?.variables).toEqual([
      {
        name: 'port',
        default: '1883',
        description: 'Broker port. Use 8883 for TLS.',
        enum: ['1883', '8883'],
      },
    ]);
  });

  it('parses message examples', async () => {
    const doc = await load();
    const receive = doc.operations.find((o) => o.action === 'receive');
    const example = receive?.messages[0]?.examples?.[0];
    expect(example?.name).toBe('Bright afternoon');
    expect(example?.summary).toBe('A typical daytime reading.');
    expect(example?.value).toEqual({ lumens: 900, sentAt: '2024-06-01T14:00:00Z' });
  });

  it('parses message correlationId', async () => {
    const doc = await load();
    const receive = doc.operations.find((o) => o.action === 'receive');
    expect(receive?.messages[0]?.correlationId).toEqual({
      location: '$message.header#/correlationId',
      description: 'Correlates a reading with the request that triggered it, when polled.',
    });
  });

  it('parses operation-level tags and, separately, channel-restricted servers', async () => {
    const doc = await load();
    const receive = doc.operations.find((o) => o.action === 'receive');
    expect(receive?.tags).toEqual(['telemetry']);
    expect(receive?.channelServers).toEqual(['mosquitto']);
  });

  it('models operation reply: the reply channel, address location and its message', async () => {
    const doc = await load();
    const dim = doc.operations.find((o) => o.id === 'senddimlight');
    expect(dim?.reply).toMatchObject({
      channelAddress: expect.stringContaining('dim/ack'),
      addressLocation: '$message.header#/correlationId',
      addressDescription: 'Matches the acknowledgement to the original dimming request.',
    });
    expect(dim?.reply?.messages[0]?.name).toBe('dimLightAck');
    expect(dim?.reply?.messages[0]?.payload?.properties?.map((p) => p.name)).toEqual(['level']);
  });

  it('keeps a channel with no operation referencing it, instead of dropping it', async () => {
    const doc = await load();
    const addresses = doc.orphanChannels.map((c) => c.address);
    // Declared purely for documentation ahead of any operation being wired to it.
    expect(addresses.some((a) => a.includes('fault'))).toBe(true);
    // Only reachable via `operation.reply`, never as a top-level operation -- also orphaned.
    expect(addresses.some((a) => a.includes('dim/ack'))).toBe(true);
    const fault = doc.orphanChannels.find((c) => c.address.includes('fault'));
    expect(fault?.parameters.map((p) => p.name)).toEqual(['streetlightId']);
    expect(fault?.servers).toEqual(['mosquitto']);
    expect(doc.nav.map((n) => n.label)).toContain('Channels');
  });

  it('detects a non-JSON-Schema payload (schemaFormat) and does not walk it as JSON Schema', async () => {
    const doc = (await parseApiDocument({
      asyncapi: '3.0.0',
      info: { title: 'Avro test', version: '1.0.0' },
      channels: {
        readings: {
          address: 'readings',
          messages: { reading: { $ref: '#/components/messages/Reading' } },
        },
      },
      operations: {
        receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
      },
      components: {
        messages: {
          Reading: {
            name: 'reading',
            contentType: 'application/octet-stream',
            payload: {
              schemaFormat: 'application/vnd.apache.avro+json;version=1.9.0',
              schema: {
                type: 'record',
                name: 'Reading',
                fields: [{ name: 'lumens', type: 'int' }],
              },
            },
          },
        },
      },
    })) as AsyncApiDocument;

    const message = doc.operations[0]?.messages[0];
    // Not walked as JSON Schema: no `properties`, no `type: ['record']` misread as a JSON
    // Schema type -- the field is absent entirely rather than confidently wrong.
    expect(message?.payload).toBeUndefined();
    expect(message?.payloadSchemaFormat).toBe('application/vnd.apache.avro+json;version=1.9.0');
    expect(doc.warnings).toContainEqual(
      expect.stringMatching(/payload is application\/vnd\.apache\.avro\+json.*not JSON Schema/),
    );
  });

  it('degrades a dangling internal $ref instead of failing the whole document', async () => {
    // Unlike `dereferenceDocument` (packages/core/src/formats/shared.ts), which resolves
    // with `continueOnError` and marks only the broken pointer, `@asyncapi/parser` throws
    // and abandons the entire document on a single dangling `$ref` -- confirmed empirically
    // (see the module doc comment at formats/asyncapi/index.ts) before this test existed to
    // pin the fix instead of the bug.
    const doc = (await parseApiDocument({
      asyncapi: '3.0.0',
      info: { title: 'Broken ref', version: '1.0.0' },
      channels: {
        readings: {
          address: 'readings',
          messages: { reading: { $ref: '#/components/messages/Reading' } },
        },
      },
      operations: {
        receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
      },
      components: {
        messages: {
          Reading: {
            name: 'reading',
            payload: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                external: { $ref: '#/components/schemas/DoesNotExist' },
              },
            },
          },
        },
      },
    })) as AsyncApiDocument;

    // The failure is reported rather than swallowed, and names the offending pointer --
    // the same wording OpenAPI/OpenRPC use, since this goes through the same
    // `dereferenceDocument` helper they do.
    expect(doc.warnings).toContainEqual(
      expect.stringMatching(
        /Could not resolve \$ref at components\.messages\.Reading\.payload\.properties\.external.*DoesNotExist/,
      ),
    );

    // Everything resolvable still renders: the operation, its channel and the sibling
    // property on the very schema the broken $ref lives inside.
    const payload = doc.operations[0]?.messages[0]?.payload;
    expect(doc.operations).toHaveLength(1);
    expect(doc.operations[0]?.channelAddress).toBe('readings');
    expect(payload?.properties?.map((p) => p.name)).toEqual(['id', 'external']);
    expect(payload?.properties?.[0]?.types).toEqual(['string']);

    // And the part that failed is explicitly marked, not silently empty or null.
    const external = payload?.properties?.find((p) => p.name === 'external');
    expect(external?.unresolvedRef).toBe('#/components/schemas/DoesNotExist');
  });

  it('degrades an unreachable external $ref instead of failing the whole document', async () => {
    const doc = (await parseApiDocument({
      asyncapi: '3.0.0',
      info: { title: 'Broken external ref', version: '1.0.0' },
      channels: {
        readings: {
          address: 'readings',
          messages: { reading: { $ref: '#/components/messages/Reading' } },
        },
      },
      operations: {
        receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
      },
      components: {
        messages: {
          Reading: {
            name: 'reading',
            payload: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                external: {
                  $ref: 'https://example.invalid/nope.yaml#/components/schemas/Missing',
                },
              },
            },
          },
        },
      },
    })) as AsyncApiDocument;

    expect(doc.warnings).toContainEqual(
      expect.stringMatching(
        /Could not resolve \$ref at components\.messages\.Reading\.payload\.properties\.external.*example\.invalid/,
      ),
    );

    const payload = doc.operations[0]?.messages[0]?.payload;
    expect(payload?.properties?.map((p) => p.name)).toEqual(['id', 'external']);
    const external = payload?.properties?.find((p) => p.name === 'external');
    expect(external?.unresolvedRef).toBe(
      'https://example.invalid/nope.yaml#/components/schemas/Missing',
    );
  });

  it('parses exactly as before when there are no broken $refs: no new warnings', async () => {
    // Pins the "no behaviour change on the happy path" requirement: pre-resolving to find
    // broken $refs must not itself introduce warnings or otherwise perturb a clean document.
    const doc = await load();
    expect(doc.warnings).toEqual([]);
  });

  describe('a broken $ref in a required-field position (card 35)', () => {
    // Card 34's marker degrades a broken `$ref` into an inert object, which is fine inside
    // a schema (JSON Schema has no required keywords of its own) but not where the AsyncAPI
    // meta-schema itself has required fields -- a Server Object needs `host` and `protocol`,
    // which the marker does not supply, so `@asyncapi/parser` fails the whole document on
    // *that* just as it did on the original broken `$ref`.
    const brokenServerDoc = {
      asyncapi: '3.0.0',
      info: { title: 'Broken server ref', version: '1.0.0' },
      servers: {
        mosquitto: { $ref: '#/components/servers/DoesNotExist' },
      },
      channels: {
        readings: { address: 'readings' },
      },
      operations: {
        receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
      },
    };

    it('still parses, naming the broken pointer, instead of failing the whole document', async () => {
      const doc = (await parseApiDocument(brokenServerDoc)) as AsyncApiDocument;

      expect(doc.warnings).toContainEqual(
        expect.stringMatching(/Could not resolve \$ref at servers\.mosquitto.*DoesNotExist/),
      );
      // Everything else still renders.
      expect(doc.operations).toHaveLength(1);
      expect(doc.operations[0]?.channelAddress).toBe('readings');
    });

    it('drops the entry the marker could not stand in for, rather than fabricate a fake server', async () => {
      const doc = (await parseApiDocument(brokenServerDoc)) as AsyncApiDocument;

      // A shape-aware stub was rejected in favour of dropping: it would mean encoding, and
      // maintaining, per-position knowledge of what every AsyncAPI object requires. Dropping
      // is general and honest about what happened -- the reader is told via the warning
      // above, not left looking at an invented server that was never authored.
      expect(doc.servers).toEqual([]);
    });

    it('leaves card 34s own schema-position case untouched: still a marked property, not a dropped one', async () => {
      // Same shape as the "degrades a dangling internal $ref" test above, confirming the new
      // retry path is never even entered when the marker already satisfies validation --
      // `document` is defined on the first `parser.parse` and the drop-and-retry branch
      // never runs.
      const doc = (await parseApiDocument({
        asyncapi: '3.0.0',
        info: { title: 'Broken ref', version: '1.0.0' },
        channels: {
          readings: {
            address: 'readings',
            messages: { reading: { $ref: '#/components/messages/Reading' } },
          },
        },
        operations: {
          receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
        },
        components: {
          messages: {
            Reading: {
              name: 'reading',
              payload: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  external: { $ref: '#/components/schemas/DoesNotExist' },
                },
              },
            },
          },
        },
      })) as AsyncApiDocument;

      const payload = doc.operations[0]?.messages[0]?.payload;
      expect(payload?.properties?.map((p) => p.name)).toEqual(['id', 'external']);
      const external = payload?.properties?.find((p) => p.name === 'external');
      expect(external?.unresolvedRef).toBe('#/components/schemas/DoesNotExist');
      expect(doc.warnings).not.toContainEqual(expect.stringMatching(/dropped/));
    });
  });

  describe('parser-injected extensions (card 36)', () => {
    it('does not surface x-parser-* extensions the library injects while resolving', async () => {
      // The real fixture already carries this: @asyncapi/parser stamps `x-parser-schema-id`
      // onto every schema and subschema it touches, including nested properties like these,
      // not only anonymous top-level ones.
      const doc = await load();
      const receive = doc.operations.find((o) => o.action === 'receive');
      const lumens = receive?.messages[0]?.payload?.properties?.find((p) => p.name === 'lumens');
      expect(lumens?.extensions?.some((e) => e.key.startsWith('x-parser-'))).toBeFalsy();
    });

    it('still renders a genuinely authored x- extension alongside a parser-injected one', async () => {
      const doc = (await parseApiDocument({
        asyncapi: '3.0.0',
        info: { title: 'Extension test', version: '1.0.0' },
        channels: {
          readings: {
            address: 'readings',
            messages: { reading: { $ref: '#/components/messages/Reading' } },
          },
        },
        operations: {
          receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
        },
        components: {
          messages: {
            Reading: {
              name: 'reading',
              payload: {
                type: 'object',
                'x-internal-note': 'authored extension',
                properties: { lumens: { type: 'integer' } },
              },
            },
          },
        },
      })) as AsyncApiDocument;

      const payload = doc.operations[0]?.messages[0]?.payload;
      // The parser injects its own `x-parser-schema-id` onto this very object -- filtered --
      // while the extension actually authored in the document survives untouched.
      expect(payload?.extensions).toEqual([
        { key: 'x-internal-note', value: 'authored extension' },
      ]);
    });
  });

  describe('bindings', () => {
    it('parses MQTT bindings at server, channel, operation and message level', async () => {
      const doc = await load();
      expect(doc.servers[0]?.bindings).toEqual([
        {
          protocol: 'mqtt',
          version: '0.2.0',
          fields: [
            { key: 'clientId', value: 'streetlights-server' },
            { key: 'cleanSession', value: true },
            { key: 'keepAlive', value: 60 },
          ],
        },
      ]);

      const receive = doc.operations.find((o) => o.action === 'receive');
      expect(receive?.bindings).toEqual([
        { protocol: 'mqtt', version: '0.2.0', fields: [{ key: 'qos', value: 1 }] },
      ]);
      expect(receive?.channelBindings).toEqual([
        {
          protocol: 'mqtt',
          version: '0.2.0',
          fields: [
            { key: 'qos', value: 1 },
            { key: 'retain', value: false },
          ],
        },
      ]);
      expect(receive?.messages[0]?.bindings).toEqual([
        {
          protocol: 'mqtt',
          version: '0.2.0',
          fields: [{ key: 'payloadFormatIndicator', value: 1 }],
        },
      ]);
    });

    it('parses Kafka bindings at all four locations, each field keeping its own meaning', async () => {
      const doc = (await parseApiDocument({
        asyncapi: '3.0.0',
        info: { title: 'Kafka test', version: '1.0.0' },
        servers: {
          broker: {
            host: 'kafka:9092',
            protocol: 'kafka',
            bindings: {
              kafka: {
                schemaRegistryUrl: 'https://schema-registry.internal',
                schemaRegistryVendor: 'confluent',
                bindingVersion: '0.5.0',
              },
            },
          },
        },
        channels: {
          readings: {
            address: 'readings',
            bindings: {
              kafka: { topic: 'readings.v1', partitions: 6, replicas: 3, bindingVersion: '0.5.0' },
            },
            messages: { reading: { $ref: '#/components/messages/Reading' } },
          },
        },
        operations: {
          receiveReadings: {
            action: 'receive',
            channel: { $ref: '#/channels/readings' },
            bindings: {
              kafka: {
                groupId: { type: 'string' },
                clientId: { type: 'string' },
                bindingVersion: '0.5.0',
              },
            },
          },
        },
        components: {
          messages: {
            Reading: {
              payload: { type: 'object' },
              bindings: { kafka: { key: { type: 'string' }, bindingVersion: '0.5.0' } },
            },
          },
        },
      })) as AsyncApiDocument;

      expect(doc.servers[0]?.bindings).toEqual([
        {
          protocol: 'kafka',
          version: '0.5.0',
          fields: [
            { key: 'schemaRegistryUrl', value: 'https://schema-registry.internal' },
            { key: 'schemaRegistryVendor', value: 'confluent' },
          ],
        },
      ]);

      const operation = doc.operations[0];
      expect(operation?.channelBindings).toEqual([
        {
          protocol: 'kafka',
          version: '0.5.0',
          fields: [
            { key: 'topic', value: 'readings.v1' },
            { key: 'partitions', value: 6 },
            { key: 'replicas', value: 3 },
          ],
        },
      ]);
      // Nested object values (a Kafka binding's `groupId`/`clientId` are themselves schema
      // objects, not scalars) survive verbatim rather than being flattened or dropped.
      expect(operation?.bindings).toEqual([
        {
          protocol: 'kafka',
          version: '0.5.0',
          fields: [
            { key: 'groupId', value: { type: 'string' } },
            { key: 'clientId', value: { type: 'string' } },
          ],
        },
      ]);
      expect(operation?.messages[0]?.bindings).toEqual([
        {
          protocol: 'kafka',
          version: '0.5.0',
          fields: [{ key: 'key', value: { type: 'string' } }],
        },
      ]);
    });

    it('surfaces bindings for a protocol with no protocol-specific code in the parser (NATS)', async () => {
      // Pins the point of the generic model: apibox does not special-case NATS anywhere in
      // `formats/asyncapi/index.ts` -- `toBindings` reads whatever protocol/fields the
      // document and library hand it. A protocol reaching the model with no bespoke code
      // path is what proves the model is actually generic, not merely under-tested.
      const doc = (await parseApiDocument({
        asyncapi: '3.0.0',
        info: { title: 'NATS test', version: '1.0.0' },
        servers: {
          n: {
            host: 'nats://n:4222',
            protocol: 'nats',
            bindings: { nats: { bindingVersion: '0.1.0' } },
          },
        },
        channels: {
          events: {
            address: 'events.created',
            bindings: { nats: { queue: 'workers', bindingVersion: '0.1.0' } },
            messages: { m: { $ref: '#/components/messages/M' } },
          },
        },
        operations: {
          send: {
            action: 'send',
            channel: { $ref: '#/channels/events' },
            bindings: { nats: { bindingVersion: '0.1.0' } },
          },
        },
        components: {
          messages: {
            M: { payload: { type: 'object' }, bindings: { nats: { bindingVersion: '0.1.0' } } },
          },
        },
      })) as AsyncApiDocument;

      expect(doc.operations[0]?.channelBindings).toEqual([
        { protocol: 'nats', version: '0.1.0', fields: [{ key: 'queue', value: 'workers' }] },
      ]);
    });

    it('defaults bindingVersion to "latest" when the document does not declare one', async () => {
      const doc = (await parseApiDocument({
        asyncapi: '3.0.0',
        info: { title: 'Default binding version', version: '1.0.0' },
        servers: {
          h: { host: 'h', protocol: 'http', bindings: { http: {} } },
        },
        channels: { c: { address: 'c' } },
        operations: { op: { action: 'send', channel: { $ref: '#/channels/c' } } },
      })) as AsyncApiDocument;

      expect(doc.servers[0]?.bindings).toEqual([
        { protocol: 'http', version: 'latest', fields: [] },
      ]);
    });

    it('keeps the broken-$ref and security-scheme-identity fixes intact alongside bindings', async () => {
      // Bindings are read via the same `operation`/`channel`/`message` models the broken-$ref
      // resilience and security-scheme-name recovery depend on -- this pins that adding
      // `toBindings()` calls to those same accessors did not disturb either.
      const doc = (await parseApiDocument({
        asyncapi: '3.0.0',
        info: { title: 'Broken ref plus bindings', version: '1.0.0' },
        servers: {
          broker: {
            host: 'kafka:9092',
            protocol: 'kafka',
            bindings: { kafka: { bindingVersion: '0.5.0' } },
            security: [{ $ref: '#/components/securitySchemes/apiToken' }],
          },
        },
        channels: {
          readings: {
            address: 'readings',
            messages: { reading: { $ref: '#/components/messages/Reading' } },
          },
        },
        operations: {
          receiveReadings: { action: 'receive', channel: { $ref: '#/channels/readings' } },
        },
        components: {
          securitySchemes: { apiToken: { type: 'httpApiKey', name: 'X-Api-Token', in: 'header' } },
          messages: {
            Reading: {
              payload: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  external: { $ref: '#/components/schemas/DoesNotExist' },
                },
              },
            },
          },
        },
      })) as AsyncApiDocument;

      expect(doc.servers[0]?.bindings).toEqual([
        { protocol: 'kafka', version: '0.5.0', fields: [] },
      ]);
      expect(doc.servers[0]?.security).toEqual([
        { alternatives: [{ scheme: 'apiToken', scopes: [] }] },
      ]);
      const external = doc.operations[0]?.messages[0]?.payload?.properties?.find(
        (p) => p.name === 'external',
      );
      expect(external?.unresolvedRef).toBe('#/components/schemas/DoesNotExist');
    });
  });
});

describe('AsyncAPI 2.x', () => {
  it('parses via the same pre-resolution path as 3.x, with no unresolved-$ref warnings', async () => {
    // The fix for card 34 pre-resolves before handing the document to @asyncapi/parser
    // regardless of spec version. Confirms that pass does not disturb an otherwise-clean
    // 2.x document, which took a completely untouched path before this fix.
    const doc = (await loadApiDocument(
      fixtures('v2-streetlights.asyncapi.yaml'),
    )) as AsyncApiDocument;
    expect(doc.warnings.some((w) => w.includes('Could not resolve $ref'))).toBe(false);
  });

  it('reads a channel parameter schema from the v2 Parameter Object', async () => {
    // 2.x nests a JSON Schema under `schema`; 3.x describes the parameter inline. Reading
    // the v2 Parameter Object itself yields an untyped parameter.
    const doc = (await loadApiDocument(
      fixtures('v2-streetlights.asyncapi.yaml'),
    )) as AsyncApiDocument;

    const operation = doc.operations[0];
    expect(operation?.parameters.map((p) => p.name)).toEqual(['streetlightId']);
    expect(operation?.parameters[0]?.schema?.types).toEqual(['string']);
    expect(operation?.parameters[0]?.schema?.constraints).toContainEqual({
      label: 'pattern',
      value: '^[0-9]+$',
    });
  });

  it('maps the 2.x publish/subscribe verbs onto send/receive', async () => {
    const doc = (await loadApiDocument(
      fixtures('v2-streetlights.asyncapi.yaml'),
    )) as AsyncApiDocument;
    expect(doc.operations.map((o) => o.action)).toEqual(['receive']);
    expect(doc.operations[0]?.messages[0]?.payload?.properties?.map((p) => p.name)).toEqual([
      'lumens',
    ]);
  });

  it('reads AMQP bindings on a 2.x channel, its subscribe operation and its message, through the same generic model as 3.x', async () => {
    const doc = (await loadApiDocument(
      fixtures('v2-streetlights.asyncapi.yaml'),
    )) as AsyncApiDocument;
    const operation = doc.operations[0];

    expect(operation?.channelBindings).toEqual([
      { protocol: 'amqp', version: '0.3.0', fields: [{ key: 'is', value: 'routingKey' }] },
    ]);
    expect(operation?.bindings).toEqual([
      { protocol: 'amqp', version: '0.3.0', fields: [{ key: 'ack', value: true }] },
    ]);
    expect(operation?.messages[0]?.bindings).toEqual([
      {
        protocol: 'amqp',
        version: '0.3.0',
        fields: [
          { key: 'contentEncoding', value: 'gzip' },
          { key: 'messageType', value: 'measurement' },
        ],
      },
    ]);
  });
});

describe('JSON-RPC', () => {
  const load = () => loadApiDocument(examples('wallet.openrpc.json')) as Promise<JsonRpcDocument>;

  it('normalises methods, params, results and errors', async () => {
    const doc = await load();
    expect(doc.kind).toBe('jsonrpc');
    expect(doc.title).toBe('Wallet RPC');
    expect(doc.methods.map((m) => m.name)).toEqual([
      'getBalance',
      'sendTransfer',
      'subscribeBlocks',
    ]);

    const getBalance = doc.methods[0];
    expect(getBalance?.params.map((p) => [p.name, p.required])).toEqual([
      ['address', true],
      ['block', false],
      ['legacyFormat', false],
    ]);
    expect(getBalance?.result?.name).toBe('balance');
    expect(getBalance?.errors).toEqual([
      { code: -32001, message: 'Unknown account', description: undefined, schema: undefined },
    ]);
  });

  it('resolves a $ref-ed param schema and keeps its component name', async () => {
    const doc = await load();
    const transaction = doc.methods.find((m) => m.name === 'sendTransfer')?.params[0];
    expect(transaction?.schema?.refName).toBe('Transaction');
    expect(transaction?.schema?.properties?.map((p) => p.name)).toEqual([
      'from',
      'to',
      'value',
      'signature',
      'memo',
    ]);
  });

  it('collapses a named example into the payload a caller would send', async () => {
    const doc = await load();
    const example = doc.methods[0]?.examples[0];
    expect(example?.name).toBe('A funded account');
    expect(example?.params).toEqual({
      address: '0x0000000000000000000000000000000000000001',
    });
    expect(example?.result).toBe('1250000000000000000');
  });

  it('defaults paramStructure to `either` when unstated', async () => {
    const doc = await load();
    expect(doc.methods[0]?.paramStructure).toBe('either');
  });

  it('shapes an example to the declared paramStructure, not the example itself', async () => {
    // Example items carry names even for a positional method, so inferring the shape from
    // them alone produces a request the method would reject.
    const byPosition = (await parseApiDocument({
      openrpc: '1.2.6',
      info: { title: 'R', version: '1.0.0' },
      methods: [
        {
          name: 'positional',
          paramStructure: 'by-position',
          params: [],
          examples: [
            {
              name: 'e',
              params: [
                { name: 'a', value: 1 },
                { name: 'b', value: 2 },
              ],
              result: { name: 'r', value: 0 },
            },
          ],
        },
      ],
    })) as JsonRpcDocument;
    expect(byPosition.methods[0]?.examples[0]?.params).toEqual([1, 2]);

    const byName = (await parseApiDocument({
      openrpc: '1.2.6',
      info: { title: 'R', version: '1.0.0' },
      methods: [
        {
          name: 'named',
          paramStructure: 'by-name',
          params: [],
          examples: [
            { name: 'e', params: [{ name: 'a', value: 1 }], result: { name: 'r', value: 0 } },
          ],
        },
      ],
    })) as JsonRpcDocument;
    expect(byName.methods[0]?.examples[0]?.params).toEqual({ a: 1 });
  });

  it('groups the nav by tag', async () => {
    const doc = await load();
    expect(doc.nav.map((n) => n.label)).toEqual([
      'accounts',
      'transfers',
      'subscriptions',
      'Schemas',
    ]);
  });

  it('parses info.summary, root externalDocs and root x-* extensions', async () => {
    const doc = await load();
    expect(doc.summary).toBe('Query balances and send transfers over JSON-RPC.');
    expect(doc.externalDocs).toEqual({
      description: 'Full API guide',
      url: 'https://docs.example.com/wallet-rpc',
    });
    expect(doc.extensions).toEqual([{ key: 'x-internal-id', value: 'wallet-rpc' }]);
  });

  it('parses info.termsOfService, same as AsyncAPI already does', async () => {
    const doc = await load();
    expect(doc.termsOfService).toBe('https://example.com/wallet-rpc-terms');
  });

  it("reads an Example Object's externalValue for both a param and the result", async () => {
    const doc = await load();
    const example = doc.methods
      .find((m) => m.name === 'getBalance')
      ?.examples.find((e) => e.name === 'A remotely hosted example');

    // Params are collapsed into the request shape a caller would send; a param given only
    // by externalValue has nowhere else to go there, so its URL is surfaced as the
    // placeholder value at that slot rather than silently dropped.
    expect(example?.params).toEqual({ address: 'https://example.com/examples/address.json' });
    // The result is a single Example Object -- room enough to model externalValue as its
    // own field, distinct from an inline value.
    expect(example?.result).toBeUndefined();
    expect(example?.resultExternalValue).toBe('https://example.com/examples/balance.json');
  });

  it('parses server variables from the map form of the Server Object', async () => {
    const doc = await load();
    const server = doc.servers[0];
    expect(server?.url).toBe('https://{environment}.rpc.example.com');
    expect(server?.variables).toEqual([
      {
        name: 'environment',
        default: 'mainnet',
        description: 'Network to connect to.',
        enum: ['mainnet', 'testnet'],
      },
    ]);
  });

  it('keeps tag description and externalDocs, not just the name', async () => {
    const doc = await load();
    const accounts = doc.tags.find((t) => t.name === 'accounts');
    expect(accounts?.description).toBe('Methods for inspecting account state.');
    expect(accounts?.externalDocs?.url).toBe('https://docs.example.com/accounts');
  });

  it('parses method.links with its own params, target method and no server override', async () => {
    const doc = await load();
    const link = doc.methods.find((m) => m.name === 'getBalance')?.links[0];
    expect(link?.name).toBe('SendTransferFromAccount');
    expect(link?.summary).toBe('Send a transfer once the balance is known');
    expect(link?.method).toBe('sendTransfer');
    expect(link?.params).toEqual([{ name: 'transaction', value: '$params.address' }]);
    expect(link?.server).toBeUndefined();
  });

  it('parses a per-method server override, independent of the document default', async () => {
    const doc = await load();
    const sendTransfer = doc.methods.find((m) => m.name === 'sendTransfer');
    expect(sendTransfer?.servers).toEqual([
      { name: 'relay', url: 'https://relay.example.com', description: 'Dedicated broadcast relay' },
    ]);
    expect(sendTransfer?.externalDocs?.url).toBe('https://docs.example.com/sendTransfer');
  });

  it('captures the deprecated flag on a result ContentDescriptor', async () => {
    const doc = await load();
    expect(doc.methods.find((m) => m.name === 'sendTransfer')?.result?.deprecated).toBe(true);
    expect(doc.methods.find((m) => m.name === 'getBalance')?.result?.deprecated).toBe(false);
  });

  it('captures the deprecated flag on a param', async () => {
    const doc = await load();
    const legacyFormat = doc.methods
      .find((m) => m.name === 'getBalance')
      ?.params.find((p) => p.name === 'legacyFormat');
    expect(legacyFormat?.deprecated).toBe(true);
  });

  it('defaults specVersion to the current OpenRPC release when the document omits `openrpc`', async () => {
    const doc = (await parseApiDocument(
      { info: { title: 'No version field', version: '1.0.0' }, methods: [] },
      { format: 'jsonrpc' },
    )) as JsonRpcDocument;
    expect(doc.specVersion).toBe('1.3.2');
  });

  it('resolves a $ref to components.tags and keeps its description', async () => {
    const doc = (await parseApiDocument({
      openrpc: '1.3.2',
      info: { title: 'Shared tag', version: '1.0.0' },
      methods: [
        { name: 'a', tags: [{ $ref: '#/components/tags/shared' }], params: [] },
        { name: 'b', tags: [{ $ref: '#/components/tags/shared' }], params: [] },
      ],
      components: {
        tags: { shared: { name: 'shared', description: 'A tag reused by two methods.' } },
      },
    })) as JsonRpcDocument;
    expect(doc.tags).toEqual([
      { name: 'shared', description: 'A tag reused by two methods.', externalDocs: undefined },
    ]);
  });
});

describe('parseDocument', () => {
  it('parses JSON and YAML with the same call', () => {
    expect(parseDocument('{"a": 1}')).toEqual({ a: 1 });
    expect(parseDocument('a: 1\n')).toEqual({ a: 1 });
  });

  it('throws a readable error on malformed input', () => {
    expect(() => parseDocument('{ unterminated')).toThrow();
  });
});
