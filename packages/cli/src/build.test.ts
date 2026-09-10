import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSite } from './build.js';
import { runCli } from './cli.js';

const temporaryDirectories: string[] = [];
const repositoryRoot = resolve(import.meta.dirname, '../../..');

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'apibox-cli-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('buildSite', () => {
  it('builds all example formats from file and glob inputs', async () => {
    const output = await temporaryDirectory();
    const result = await buildSite({
      cwd: repositoryRoot,
      inputs: ['examples/*.yaml', 'examples/wallet.openrpc.json'],
      outDir: output,
      title: 'Example APIs',
      base: '/apibox',
      generatedAt: '2026-09-10T00:00:00.000Z',
    });

    expect(result.manifest).toMatchObject({
      schemaVersion: 1,
      title: 'Example APIs',
      generatedAt: '2026-09-10T00:00:00.000Z',
      documents: [
        { id: 'petstore', kind: 'openapi', path: 'petstore.json' },
        { id: 'streetlights', kind: 'asyncapi', path: 'streetlights.json' },
        { id: 'wallet', kind: 'jsonrpc', path: 'wallet.json' },
      ],
    });
    expect((await readdir(join(output, 'data'))).sort()).toEqual([
      'manifest.json',
      'petstore.json',
      'streetlights.json',
      'wallet.json',
    ]);
    expect(await readdir(join(output, 'assets'))).not.toHaveLength(0);
    const html = await readFile(join(output, 'index.html'), 'utf8');
    expect(html).toContain('<base href="/apibox/" />');
    expect(html).toContain('<title>Example APIs</title>');
  });

  it('reports unmatched glob inputs', async () => {
    await expect(
      buildSite({
        cwd: repositoryRoot,
        inputs: ['examples/missing-*.yaml'],
        outDir: await temporaryDirectory(),
      }),
    ).rejects.toThrow('matched no files');
  });

  it('loads URL inputs', async () => {
    const source = await readFile(join(repositoryRoot, 'examples/petstore.yaml'), 'utf8');
    const fetcher = vi.fn(async () => new Response(source, { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const url = 'https://example.com/remote.openapi.yaml';
    const result = await buildSite({
      inputs: [url],
      outDir: await temporaryDirectory(),
    });
    expect(fetcher).toHaveBeenCalledWith(url);
    expect(result.manifest.documents).toMatchObject([
      { id: 'remote', kind: 'openapi', title: 'Petstore' },
    ]);
  });
});

describe('runCli', () => {
  it('scaffolds a config without overwriting an existing file', async () => {
    const directory = await temporaryDirectory();
    const path = join(directory, 'apibox.config.ts');
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    };

    await expect(runCli(['init', path], io)).resolves.toBe(0);
    expect(await readFile(path, 'utf8')).toContain("from 'apibox'");
    await expect(runCli(['init', path], io)).resolves.toBe(1);
    expect(stderr.at(-1)).toContain('EEXIST');
    expect(stdout).toHaveLength(1);
  });

  it('uses the generated config contract when build has no positional inputs', async () => {
    const directory = await temporaryDirectory();
    const output = join(directory, 'site');
    await writeFile(
      join(directory, 'apibox.config.mjs'),
      `export default ${JSON.stringify({
        inputs: [join(repositoryRoot, 'examples/petstore.yaml')],
        out: output,
        title: 'Configured APIs',
        base: '/configured/',
      })};\n`,
      'utf8',
    );
    const stdout: string[] = [];
    const code = await runCli(
      ['build'],
      { stdout: (message) => stdout.push(message), stderr: vi.fn() },
      directory,
    );

    expect(code).toBe(0);
    expect(stdout).toEqual([`Built 1 document(s) in ${output}`]);
    const manifest = JSON.parse(await readFile(join(output, 'data/manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ title: 'Configured APIs', generator: 'apibox/0.1.0' });
    expect(await readFile(join(output, 'index.html'), 'utf8')).toContain(
      '<base href="/configured/" />',
    );
  });
});
