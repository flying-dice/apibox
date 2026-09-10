import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadApiDocument } from '../parse.js';
import type { OpenApiDocument } from '../types.js';
import { dereferenceDocument } from './shared.js';

/** Walk a plain object/array tree by path, for poking at parser output in tests. */
function pathAt(root: unknown, path: string[]): unknown {
  let node: unknown = root;
  for (const segment of path) {
    node = Array.isArray(node)
      ? node[Number(segment)]
      : (node as Record<string, unknown> | undefined)?.[segment];
  }
  return node;
}

const fixtures = (name: string) =>
  fileURLToPath(new URL(`../../test/fixtures/${name}`, import.meta.url));

describe('dereferenceDocument', () => {
  it('resolves everything it can when one reference fails inside an array', async () => {
    // Arrays are the case that breaks naive path walking: `parameters.1` needs an index,
    // not an object key.
    const doc = (await loadApiDocument(fixtures('broken-ref-in-array.yaml'))) as OpenApiDocument;

    // The valid internal $ref elsewhere in the document still resolves.
    const responseSchema = doc.operations[0]?.responses[0]?.content[0]?.schema;
    expect(responseSchema?.refName).toBe('Kept');
    expect(responseSchema?.properties?.map((p) => p.name)).toEqual(['id']);

    // The failure is named, with its path.
    expect(doc.warnings.join(' ')).toMatch(/parameters\.1/);
  });

  it('leaves a marker, never a bare null, where a reference failed inside an array', async () => {
    // A `null` would normalise into an untyped property and lose the fact that a reference
    // was meant to be there at all.
    const warnings: string[] = [];
    const resolved = await dereferenceDocument(
      {
        openapi: '3.1.0',
        paths: {
          '/a': {
            get: {
              parameters: [
                { name: 'ok', in: 'query' },
                { $ref: 'https://example.invalid/broken.yaml' },
              ],
            },
          },
        },
      },
      fixtures('broken-ref-in-array.yaml'),
      warnings,
    );

    const parameters = pathAt(resolved, ['paths', '/a', 'get', 'parameters']) as unknown[];

    expect(parameters[0]).toMatchObject({ name: 'ok' });
    expect(parameters[1]).toEqual({ $ref: 'https://example.invalid/broken.yaml' });
    expect(warnings).toHaveLength(1);
  });

  it('refuses to write through a prototype-polluting key', async () => {
    // A specification document is untrusted input, and a property really can be named
    // `__proto__`. Parsed from raw JSON, which is how a spec actually arrives and the only
    // way to get a genuine own property — assigning `__proto__` invokes the setter instead.
    const root = JSON.parse(`{
      "openapi": "3.1.0",
      "components": {
        "schemas": {
          "Evil": {
            "type": "object",
            "properties": {
              "__proto__": { "$ref": "https://example.invalid/pollute.yaml" }
            }
          }
        }
      }
    }`) as Record<string, unknown>;

    const properties = pathAt(root, ['components', 'schemas', 'Evil', 'properties']) as object;
    expect(Object.hasOwn(properties, '__proto__')).toBe(true);

    const warnings: string[] = [];
    await dereferenceDocument(root, fixtures('broken-ref-in-array.yaml'), warnings);

    // The reference failed, so restoration was attempted at a `__proto__` path.
    expect(warnings.length).toBeGreaterThan(0);
    expect(Object.hasOwn(Object.prototype, '$ref')).toBe(false);
    expect(({} as Record<string, unknown>).$ref).toBeUndefined();
  });

  it('produces no warnings for a document with nothing to resolve', async () => {
    const warnings: string[] = [];
    const root = { openapi: '3.1.0', paths: { '/a': { get: { responses: {} } } } };
    const resolved = await dereferenceDocument(
      root,
      fixtures('broken-ref-in-array.yaml'),
      warnings,
    );

    expect(warnings).toEqual([]);
    expect(resolved.paths).toBeDefined();
  });

  it('writes readable warnings, never the string "undefined"', async () => {
    // `describeError` has to cope with a non-Error being thrown; a warning reading
    // "Could not resolve $ref at x: undefined" would be useless to a reader.
    const doc = (await loadApiDocument(fixtures('broken-ref-in-array.yaml'))) as OpenApiDocument;

    expect(doc.warnings.length).toBeGreaterThan(0);
    for (const warning of doc.warnings) {
      expect(warning).not.toMatch(/undefined/);
      expect(warning.length).toBeGreaterThan(20);
    }
  });
});
