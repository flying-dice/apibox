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

  it('builds a nav grouped by tag, in document tag order, with a Schemas group', async () => {
    const doc = await load();
    expect(doc.nav.map((n) => n.label)).toEqual(['pets', 'store', 'Schemas']);
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

  it('confirms AsyncAPI dereferencing does not have OpenAPI/OpenRPC unresolved-$ref parity: a broken $ref fails the whole document rather than degrading', async () => {
    // Unlike `dereferenceDocument` (packages/core/src/formats/shared.ts), which resolves
    // with `continueOnError` and marks only the broken pointer, `@asyncapi/parser` throws
    // and abandons the entire document on a single dangling `$ref`. This is the confirmed
    // answer to the "verify dereference warning parity" checklist item -- it is a real gap,
    // not merely unverified.
    await expect(
      parseApiDocument({
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
                properties: { external: { $ref: '#/components/schemas/DoesNotExist' } },
              },
            },
          },
        },
      }),
    ).rejects.toThrow(UnsupportedDocumentError);
  });
});

describe('AsyncAPI 2.x', () => {
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
