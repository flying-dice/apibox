import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseApiDocument, parseDocument } from '@apibox/core';
import { isViewerToHostMessage } from '@apibox/viewer/protocol';
import { describe, expect, it } from 'vitest';
import { manifestMessage } from './preview-protocol.js';
import { pagesWorkflow } from './workflow.js';

describe('preview protocol', () => {
  it('accepts only supported viewer requests', () => {
    expect(isViewerToHostMessage({ type: 'apibox/loadManifest' })).toBe(true);
    expect(isViewerToHostMessage({ type: 'apibox/loadDocument', documentId: 'pets' })).toBe(true);
    expect(isViewerToHostMessage({ type: 'apibox/loadDocument' })).toBe(false);
    expect(isViewerToHostMessage({ type: 'unknown' })).toBe(false);
    expect(isViewerToHostMessage(null)).toBe(false);
  });

  it('creates the single-document manifest consumed by the viewer', async () => {
    const path = resolve(import.meta.dirname, '../../../examples/petstore.yaml');
    const document = await parseApiDocument(parseDocument(await readFile(path, 'utf8')), {
      location: path,
    });
    const message = manifestMessage(document);
    expect(message).toMatchObject({
      type: 'apibox/manifest',
      manifest: {
        schemaVersion: 1,
        title: 'Petstore',
        documents: [{ id: 'petstore', kind: 'openapi', path: 'petstore.json' }],
      },
    });
  });
});

describe('GitHub Pages workflow', () => {
  it('quotes user input and emits the Pages action sequence', () => {
    const workflow = pagesWorkflow("specs/team's API.{yaml,json}");
    expect(workflow).toContain('APIBOX_INPUTS: "specs/team\'s API.{yaml,json}"');
    expect(workflow).toContain('build "$APIBOX_INPUTS"');
    expect(workflow).toContain('actions/checkout@v6');
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });

  it('keeps line breaks inside the YAML-quoted environment value', () => {
    const workflow = pagesWorkflow('specs/*.yaml\nrun: echo unsafe');
    expect(workflow).toContain('APIBOX_INPUTS: "specs/*.yaml\\nrun: echo unsafe"');
    expect(workflow).not.toContain('\nrun: echo unsafe\n');
  });
});
