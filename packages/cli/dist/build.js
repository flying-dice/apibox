import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApiDocument, toManifestEntry, uniqueId } from '@apibox/core';
import { expandInputs } from './inputs.js';
const BASE_MARKER = '<!-- apibox:base -->';
const TITLE_MARKER = '<!-- apibox:title -->';
export async function buildSite(options) {
    if (options.inputs.length === 0)
        throw new Error('Provide at least one API specification.');
    const cwd = options.cwd ?? process.cwd();
    const outDir = resolve(cwd, options.outDir);
    const sources = await expandInputs(options.inputs, cwd);
    const documents = await loadDocuments(sources);
    const manifest = createManifest(documents, options.generator ?? (await generatorName()), options.title, options.generatedAt);
    await cp(options.assetDir ?? defaultAssetDirectory(), outDir, {
        recursive: true,
        force: true,
    });
    await mkdir(resolve(outDir, 'data'), { recursive: true });
    await Promise.all(documents.map((document) => writeJson(resolve(outDir, 'data', `${document.id}.json`), document)));
    await writeJson(resolve(outDir, 'data', 'manifest.json'), manifest);
    await rewriteIndex(resolve(outDir, 'index.html'), options.title ?? 'apibox', options.base ?? './');
    return { outDir, manifest };
}
async function loadDocuments(sources) {
    const takenIds = new Set();
    const documents = [];
    for (const source of sources) {
        const document = await loadApiDocument(source);
        const id = uniqueId(document.id, takenIds);
        documents.push(id === document.id ? document : { ...document, id });
    }
    return documents;
}
function createManifest(documents, generator, title = 'API documentation', generatedAt = new Date().toISOString()) {
    return {
        schemaVersion: 1,
        title,
        generatedAt,
        generator,
        documents: documents.map((document) => toManifestEntry(document)),
    };
}
async function writeJson(path, value) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
async function rewriteIndex(path, title, base) {
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
async function generatorName() {
    const packageJson = JSON.parse(await readFile(packageJsonPath(), 'utf8'));
    if (typeof packageJson !== 'object' ||
        packageJson === null ||
        !('version' in packageJson) ||
        typeof packageJson.version !== 'string') {
        throw new Error('The CLI package metadata does not contain a valid version.');
    }
    return `apibox/${packageJson.version}`;
}
function defaultAssetDirectory() {
    return fileURLToPath(new URL('../assets/viewer', import.meta.url));
}
function packageJsonPath() {
    return fileURLToPath(new URL('../package.json', import.meta.url));
}
function normaliseBase(base) {
    if (base === '' || base === '.')
        return './';
    if (base.endsWith('/') || base.endsWith('#'))
        return base;
    return `${base}/`;
}
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}
