import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiDocument, Manifest } from '@apibox/core';
import { loadApiDocument, uniqueId } from '@apibox/core';
import { expandInputs } from './inputs.js';

const DEFAULT_ASSET_DIRECTORY = fileURLToPath(new URL('../assets/viewer', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));
const BASE_MARKER = '<!-- apibox:base -->';
const TITLE_MARKER = '<!-- apibox:title -->';

export interface BuildOptions {
  inputs: readonly string[];
  outDir: string;
  title?: string;
  base?: string;
  cwd?: string;
  assetDir?: string;
  generatedAt?: string;
  generator?: string;
}

export interface BuildResult {
  outDir: string;
  manifest: Manifest;
}

export async function buildSite(options: BuildOptions): Promise<BuildResult> {
  if (options.inputs.length === 0) throw new Error('Provide at least one API specification.');
  const cwd = options.cwd ?? process.cwd();
  const outDir = resolve(cwd, options.outDir);
  const sources = await expandInputs(options.inputs, cwd);
  const documents = await loadDocuments(sources);
  const manifest = createManifest(
    documents,
    options.generator ?? (await generatorName()),
    options.title,
    options.generatedAt,
  );

  await cp(options.assetDir ?? DEFAULT_ASSET_DIRECTORY, outDir, {
    recursive: true,
    force: true,
  });
  await mkdir(resolve(outDir, 'data'), { recursive: true });
  await Promise.all(
    documents.map((document) =>
      writeJson(resolve(outDir, 'data', `${document.id}.json`), document),
    ),
  );
  await writeJson(resolve(outDir, 'data', 'manifest.json'), manifest);
  await rewriteIndex(
    resolve(outDir, 'index.html'),
    options.title ?? 'apibox',
    options.base ?? './',
  );
  return { outDir, manifest };
}

async function loadDocuments(sources: string[]): Promise<ApiDocument[]> {
  const takenIds = new Set<string>();
  const documents: ApiDocument[] = [];
  for (const source of sources) {
    const document = await loadApiDocument(source);
    const id = uniqueId(document.id, takenIds);
    documents.push(id === document.id ? document : { ...document, id });
  }
  return documents;
}

function createManifest(
  documents: ApiDocument[],
  generator: string,
  title = 'API documentation',
  generatedAt = new Date().toISOString(),
): Manifest {
  return {
    schemaVersion: 1,
    title,
    generatedAt,
    generator,
    documents: documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      title: document.title,
      version: document.version,
      summary: document.summary,
      path: `${document.id}.json`,
    })),
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function rewriteIndex(path: string, title: string, base: string): Promise<void> {
  const html = await readFile(path, 'utf8');
  if (!html.includes(BASE_MARKER) || !html.includes(TITLE_MARKER)) {
    throw new Error('The prebuilt viewer is missing its apibox HTML template markers.');
  }
  const baseTag = `<base href="${escapeHtml(normaliseBase(base))}" />`;
  const rewritten = html
    .replace(BASE_MARKER, baseTag)
    .replace(`<title>${TITLE_MARKER}apibox</title>`, `<title>${escapeHtml(title)}</title>`);
  await writeFile(path, rewritten, 'utf8');
}

async function generatorName(): Promise<string> {
  const packageJson = JSON.parse(await readFile(PACKAGE_JSON, 'utf8')) as unknown;
  if (
    typeof packageJson !== 'object' ||
    packageJson === null ||
    !('version' in packageJson) ||
    typeof packageJson.version !== 'string'
  ) {
    throw new Error('The CLI package metadata does not contain a valid version.');
  }
  return `apibox/${packageJson.version}`;
}

function normaliseBase(base: string): string {
  if (base === '' || base === '.') return './';
  if (base.endsWith('/') || base.endsWith('#')) return base;
  return `${base}/`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
