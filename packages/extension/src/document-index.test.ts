import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildDocumentIndex, FORMAT_LABELS, hasPlausibleRootMarker } from './document-index.js';

const examples = (name: string) =>
  fileURLToPath(new URL(`../../../examples/${name}`, import.meta.url));
const repoRoot = (name: string) => fileURLToPath(new URL(`../../../${name}`, import.meta.url));

const readReal = (path: string) => readFile(path, 'utf8');

describe('hasPlausibleRootMarker', () => {
  it('accepts each format marker and the JSON Schema dialect key', () => {
    expect(hasPlausibleRootMarker('openapi: 3.1.0')).toBe(true);
    expect(hasPlausibleRootMarker('"asyncapi": "3.0.0"')).toBe(true);
    expect(hasPlausibleRootMarker('{"openrpc": "1.2.6"}')).toBe(true);
    expect(hasPlausibleRootMarker('swagger: "2.0"')).toBe(true);
    expect(
      hasPlausibleRootMarker('"$schema": "https://json-schema.org/draft/2020-12/schema"'),
    ).toBe(true);
  });

  it('rejects text mentioning none of the markers', () => {
    expect(hasPlausibleRootMarker('{"name": "apibox", "version": "0.1.0"}')).toBe(false);
  });
});

describe('buildDocumentIndex', () => {
  it('groups detected documents by format, in a fixed presentation order', async () => {
    const paths = [
      examples('petstore.yaml'),
      examples('streetlights.asyncapi.yaml'),
      examples('wallet.openrpc.json'),
      examples('user-profile.schema.json'),
    ];

    const groups = await buildDocumentIndex(paths, readReal);

    expect(groups.map((g) => g.format)).toEqual(['openapi', 'asyncapi', 'jsonrpc', 'jsonschema']);
    expect(groups.map((g) => g.label)).toEqual([
      FORMAT_LABELS.openapi,
      FORMAT_LABELS.asyncapi,
      FORMAT_LABELS.jsonrpc,
      FORMAT_LABELS.jsonschema,
    ]);
    expect(groups[0]?.documents).toEqual([
      { path: examples('petstore.yaml'), label: 'petstore.yaml', format: 'openapi' },
    ]);
  });

  it('omits formats with no detected documents rather than emitting an empty group', async () => {
    const groups = await buildDocumentIndex([examples('petstore.yaml')], readReal);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.format).toBe('openapi');
  });

  it('returns no groups for an empty candidate list', async () => {
    expect(await buildDocumentIndex([], readReal)).toEqual([]);
  });

  it('sorts documents within a group by label', async () => {
    const groups = await buildDocumentIndex(['b.yaml', 'a.yaml'], (path) =>
      path === 'a.yaml' ? 'openapi: 3.1.0\ninfo:\n  title: A' : 'openapi: 3.1.0\ninfo:\n  title: B',
    );
    expect(groups[0]?.documents.map((d) => d.label)).toEqual(['a.yaml', 'b.yaml']);
  });

  describe('false-positive corpus', () => {
    // Mirrors packages/core/src/parse.test.ts: none of these repo files may ever be
    // mistaken for an API document, or the rail would list package.json.
    it.each([
      ['package.json', 'package.json'],
      ['tsconfig.base.json', 'tsconfig.base.json'],
      ['biome.json', 'biome.json'],
    ])('excludes %s', async (_label, file) => {
      const groups = await buildDocumentIndex([repoRoot(file)], readReal);
      expect(groups).toEqual([]);
    });

    it('excludes a GitHub Actions workflow', async () => {
      const groups = await buildDocumentIndex([repoRoot('.github/workflows/ci.yml')], readReal);
      expect(groups).toEqual([]);
    });
  });
});
