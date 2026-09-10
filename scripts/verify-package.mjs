import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'apibox-package-'));
const consumerRoot = join(temporaryRoot, 'consumer');

async function run(command, cwd) {
  const childProcess = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' });
  const exitCode = await childProcess.exited;
  if (exitCode !== 0) throw new Error(`${command.join(' ')} exited with code ${exitCode}.`);
}

try {
  await run(['bun', 'run', 'build'], repositoryRoot);
  await run(['bun', 'run', 'sync-viewer'], repositoryRoot);
  await run(
    ['bun', 'pm', 'pack', '--ignore-scripts', '--destination', temporaryRoot],
    repositoryRoot,
  );
  const archives = (await readdir(temporaryRoot)).filter((entry) => entry.endsWith('.tgz'));
  if (archives.length !== 1 || archives[0] === undefined) {
    throw new Error(`Expected one package archive, found ${archives.length}.`);
  }
  const archive = join(temporaryRoot, archives[0]);

  await mkdir(consumerRoot);
  await writeFile(join(consumerRoot, 'package.json'), '{"private":true}\n', 'utf8');
  await writeFile(
    join(consumerRoot, 'spec.yaml'),
    'openapi: 3.1.0\ninfo:\n  title: Clean consumer\n  version: 1.0.0\npaths: {}\n',
    'utf8',
  );
  await run(['bun', 'add', archive], consumerRoot);
  await run(
    ['bunx', '--no-install', 'apibox', 'build', './spec.yaml', '--out', './site'],
    consumerRoot,
  );

  const manifest = JSON.parse(
    await readFile(join(consumerRoot, 'site/data/manifest.json'), 'utf8'),
  );
  if (manifest.documents?.[0]?.title !== 'Clean consumer') {
    throw new Error('The clean consumer generated an unexpected manifest.');
  }
  await readFile(join(consumerRoot, 'site/index.html'), 'utf8');
  console.log('Verified the packed apibox CLI in an isolated consumer project.');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
